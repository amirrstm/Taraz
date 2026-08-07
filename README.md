# Taraz

Automatic personal expense tracking from Iranian bank SMS. A single-user
Next.js PWA: your phone forwards bank SMS to a webhook, the app parses the
amount and merchant, and you tap a category from your phone's home screen.

## How it works

1. An iOS Shortcut fires on incoming bank SMS and POSTs the text to
   `/api/sms`.
2. The app parses the message, dedupes it, and drops it in the **Inbox**.
3. You open the app, tap a category on each inbox item, and it becomes a
   categorized transaction shown in `/month`.
4. If an SMS never arrives at the webhook (see **Known risk** below), you can
   paste it manually from **Add → Paste SMS**.

## Local development

```bash
pnpm install
cp .env.example .env
pnpm exec tsx scripts/hash-password.ts 'your-password'   # paste into APP_PASSWORD_HASH
pnpm db:migrate                                          # creates data/taraz.db, applies schema, seeds categories
pnpm dev
```

Local development and tests use `TURSO_DATABASE_URL=file:./data/taraz.db`. No
Turso account is needed to run the app or the test suite.

After changing `lib/db/schema.ts`, regenerate the SQL migration before
running it:

```bash
pnpm db:generate   # writes a new file under drizzle/
pnpm db:migrate    # applies it, locally or against Turso
```

### Environment variables

| Variable             | Purpose                                   | How to generate                                  |
| --------------------- | ------------------------------------------ | ------------------------------------------------- |
| `SMS_API_KEY`         | Shared secret the iOS Shortcut sends as `X-API-Key` | `openssl rand -hex 32` |
| `APP_PASSWORD_HASH`   | bcrypt hash of your login password        | `pnpm exec tsx scripts/hash-password.ts 'your-password'` |
| `COOKIE_SECRET`       | Signs the session cookie                  | `openssl rand -hex 32` |
| `TURSO_DATABASE_URL`  | Database connection                        | `file:./data/taraz.db` locally, `libsql://...` in production |
| `TURSO_AUTH_TOKEN`    | Database auth token                        | empty locally; `turso db tokens create taraz` in production |

**`.env` bcrypt trap:** Next.js's `.env` loader performs `$`-expansion, so a
bcrypt hash like `$2a$10$...` pasted raw into `.env` is silently mangled —
login then fails with a correct password and no useful error. In `.env`,
escape every `$` as `\$`:

```
APP_PASSWORD_HASH=\$2a\$10\$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ
```

This escaping is **only** needed in a local `.env` file. Vercel's environment
variable UI stores values literally — paste the hash there unescaped. If
login fails locally with the right password, check this first.

## Deployment

Hosted on Vercel with Turso (libSQL) as the database.

### 1. Create the Turso database

```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup
turso db create taraz
turso db show taraz --url          # → TURSO_DATABASE_URL
turso db tokens create taraz       # → TURSO_AUTH_TOKEN
```

### 2. Apply migrations (and seed categories) to Turso, from your machine

Migrations are **never** run at request time — `lib/db/migrate.ts` is invoked
by hand from a developer machine. Vercel functions are concurrent and
short-lived; migrating from inside one would race with itself.

```bash
TURSO_DATABASE_URL='libsql://your-db-url' TURSO_AUTH_TOKEN='your-token' pnpm db:migrate
```

Expected output: `migrations applied`. This also seeds the default expense
categories (`seedCategories` runs at the end of `runMigrations` and is safe
to run repeatedly) — without this step the app has no categories to tap.

### 3. Deploy to Vercel

Before deploying, make sure only `pnpm-lock.yaml` is present at the repo
root. Vercel picks its package manager from whichever lockfile it finds; a
stray `package-lock.json` would silently switch the build to npm. Delete it if
one ever appears.

```bash
pnpm dlx vercel        # link the project, first deploy to preview
```

Generate the secrets, then add them for Production, Preview, and Development:

```bash
openssl rand -hex 32                                     # → SMS_API_KEY
openssl rand -hex 32                                     # → COOKIE_SECRET
pnpm exec tsx scripts/hash-password.ts '<your password>' # → APP_PASSWORD_HASH

pnpm dlx vercel env add SMS_API_KEY production
pnpm dlx vercel env add APP_PASSWORD_HASH production
pnpm dlx vercel env add COOKIE_SECRET production
pnpm dlx vercel env add TURSO_DATABASE_URL production
pnpm dlx vercel env add TURSO_AUTH_TOKEN production
pnpm dlx vercel --prod
```

Expected: a live `https://<project>.vercel.app`. Visiting it redirects to
`/login`.

After any schema change: `pnpm db:generate`, commit the new migration,
then run `pnpm db:migrate` against Turso **before** deploying the code
that depends on it.

### 4. Verify the deployment

```bash
curl -i -X POST https://your-domain/api/sms \
  -H 'content-type: application/json' \
  -H 'x-api-key: <SMS_API_KEY>' \
  --data '{"text":"بانك سامان\nبرداشت مبلغ 9,926,000 انتقال وجه\nمانده 673,036,251\n1405/5/16\n11:38:58"}'
```

Expect `{"ok":true,"status":"parsed"}`, and the transaction to appear in the
Inbox after signing in.

### 5. Set up backups

Backups are the only copy of your data you control if Turso or Vercel ever
restrict or close the account. Run them from a machine you control (a laptop,
a Raspberry Pi, a small VPS) — never from Vercel.

```bash
chmod +x scripts/backup.sh
./scripts/backup.sh          # writes a dated .sql dump to $HOME/backups/taraz
```

Schedule it with cron:

```
0 3 * * * cd ~/taraz && ./scripts/backup.sh
```

The script keeps the 14 most recent dumps and prunes older ones.

## iOS Shortcut setup

Shortcuts app → **Automation** tab → **+** → **Create Personal Automation** →
**When I get a message**

- Sender: your bank's SMS sender (e.g. the bank's short code or name)
- Run Immediately, **Notify When Run: off**

Add action: **Get Contents of URL**

- URL: `https://your-domain/api/sms`
- Method: `POST`
- Headers: `X-API-Key` = your `SMS_API_KEY`
- Request Body: JSON
  - `text` → Shortcut Input (the message content)
  - `sender` → the sender (optional)

Create **one automation per bank sender** — each bank has its own SMS format
and its own sender to match on.

## Known risk

Vercel and Turso may restrict Iranian traffic or accounts at any time. If
either becomes unreachable, SMS arriving during the outage are lost at
capture — the iOS Shortcut fires once and does not retry.

The **Paste SMS** screen on the Add tab is the recovery path: the original
messages remain in the Messages app regardless of what happens to the
webhook, so nothing is permanently lost as long as you haven't deleted them.
Keeping current `turso db dump` backups (via `scripts/backup.sh`) is what
makes a provider-side account closure survivable — without them, an account
closure would mean losing all historical data, not just the messages missed
during an outage.

## Recovering a missed SMS

Open **Add → Paste SMS**, paste the bank message text from the Messages app,
and submit. It runs through the same parser as the webhook and is deduped
against anything already ingested — pasting a message that already arrived
via the webhook is harmless and reports "Already recorded" instead of
creating a duplicate (verified in Task 13's dedupe tests).

## Adding a new bank template

1. Add a fixture pair under `lib/sms/__fixtures__/`: `<bank>-<case>.txt` with
   the raw SMS (mask account digits), and `<bank>-<case>.json` with the
   expected `parse()` output, or `null` if the message is not a transaction.
2. Add a template file under `lib/sms/templates/`, modeled on `saman.ts`.
3. Register it in `lib/sms/templates/index.ts`.
4. Run `pnpm test`.

No other changes are needed.

## First-run verification checklist

- [ ] `pnpm test` — all suites pass
- [ ] `pnpm exec tsc --noEmit` — no type errors
- [ ] `pnpm build` — production build succeeds
- [ ] Unauthenticated `/inbox` redirects to `/login`
- [ ] `/api/sms` works without a session cookie
- [ ] `/api/sms` with a wrong key returns 401
- [ ] A real bank SMS forwarded from the iPhone appears in the Inbox within seconds
- [ ] Tapping a category empties the Inbox and updates `/month`
- [ ] Pasting the same SMS into Add → Paste SMS reports "Already recorded"
- [ ] Pasting an older, unseen SMS creates the transaction
- [ ] The app installs to the iPhone home screen (Share → Add to Home Screen) and opens without Safari chrome
- [ ] `./scripts/backup.sh` produces a dated `.sql` dump with your rows in it
- [ ] **The production site loads on the iPhone over mobile data with the VPN off** — this is the assumption the whole deployment rests on. Test it before building the Shortcut around it.
