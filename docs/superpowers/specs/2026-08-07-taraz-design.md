# Taraz — Design Spec

Date: 2026-08-07
Status: Approved

## 1. Problem

Iranian banks offer no open banking APIs. Purchases go unrecorded because manual
entry is forgotten. Taraz turns the bank's SMS notification into an automatic
transaction record, leaving only one action for the user: pick a category.

Personal, single-user application. Not published, no multi-tenancy, no signup.
Interface language is English; parsed SMS content is Persian.

## 2. User journey

1. User makes a purchase. Bank sends an SMS.
2. An iOS Shortcut automation fires on that SMS and POSTs the raw body to the
   Taraz webhook.
3. Taraz normalizes the text, parses amount / direction / account / balance /
   timestamp, and stores an uncategorized transaction.
4. User opens the PWA from the home screen, sees the Inbox, taps a transaction,
   taps a category. Done.
5. The Month screen shows the monthly total and per-category breakdown.

## 3. Decisions

| Area | Decision | Rationale |
|---|---|---|
| UI auth | Single password, signed httpOnly cookie (1 year) | One user; no user table, no email flows |
| Webhook auth | Separate `X-API-Key` secret | Shortcut must not hold the UI password |
| Parsing | Per-bank template registry + generic fallback | New bank = new data file, not a parser rewrite |
| Parse failure | Store as `needs_review` row with raw text | Nothing is ever lost |
| Timestamp | Parse Jalali date/time from SMS; fall back to receive time | Sample SMS carry both date and time |
| Dedupe | Hash of raw text seen within a 5-minute window | Kills Shortcut retries, keeps genuine repeats |
| Hosting | VPS + Docker + SQLite file + Caddy | Vercel/Turso geo-block Iranian IPs; phone often has no VPN |
| Categories | ~10 seeded rows in DB, editable later | Renaming must not require a deploy |
| Money | Integer rial in DB, toman in UI | No floats; toman is how prices are spoken |

## 4. Architecture

Single Next.js (App Router, TypeScript) application in one Docker container.
SQLite on a mounted volume. Caddy terminates TLS and reverse-proxies.

```
iPhone SMS ──iOS Shortcut──► POST /api/sms  (X-API-Key)
                                   │
                        normalize → parse → dedupe
                                   │
                              SQLite (Drizzle)
                                   │
        PWA UI (password cookie) ──┴── Inbox / Month / Add
```

Three isolated layers:

- **`lib/sms/`** — pure functions. No DB, no network, no I/O. Exports
  `normalize(text)` and `parse(text): ParsedSms | null`. Fully unit-testable
  from text fixtures.
- **`lib/db/`** — Drizzle schema, migrations, and query functions. The only
  module that touches SQLite.
- **`app/`** — route handlers, server actions, and React UI. Thin; delegates to
  the two modules above.

Rationale: the parser is the volatile part. Keeping it pure means a new bank
format is fixed by adding a fixture and a regex and running `vitest` — no
server, no database, no deploy loop.

## 5. Data model

`transactions`
| column | type | notes |
|---|---|---|
| id | integer pk | |
| amount | integer | rial, always positive |
| direction | text | `debit` \| `credit` |
| account_tail | text nullable | last segment of the account number |
| balance_after | integer nullable | rial |
| occurred_at | integer | unix ms, UTC |
| category_id | integer nullable fk | null while uncategorized |
| status | text | `uncategorized` \| `categorized` \| `needs_review` |
| source | text | `sms` \| `manual` |
| description | text nullable | e.g. `انتقال وجه` |
| note | text nullable | user-entered |
| sms_log_id | integer nullable fk | |
| created_at | integer | unix ms |

`categories`: id, name, icon (emoji), sort_order.
Seed: Groceries, Dining, Transport, Bills, Health, Shopping, Rent, Transfer,
Income, Other.

`sms_log`: id, raw_text, body_hash, sender nullable, received_at, parse_ok,
error nullable. Every inbound request produces exactly one row here, including
rejected and duplicate ones.

Indexes: `transactions(status)`, `transactions(occurred_at)`,
`transactions(category_id)`, `sms_log(body_hash, received_at)`.

## 6. Parser

Pipeline, each step pure:

```
raw → normalize → detectBank → extractFields → validate → ParsedSms
```

**normalize** — Persian digits `۰-۹` and Arabic digits `٠-٩` to ASCII; `ك`→`ک`;
`ي`→`ی`; strip thousands separators (`,` and `٬`), ZWNJ, and control chars;
collapse whitespace.

**Template registry** — a bank is data:

```ts
export const saman: BankTemplate = {
  id: 'saman',
  match: /بانک سامان/,
  fields: {
    direction: [
      { re: /برداشت/, value: 'debit' },
      { re: /واریز/,  value: 'credit' },
    ],
    amount:      /مبلغ\s+(\d+)/,
    account:     /از\s+([\d-]+)/,
    balance:     /مانده\s+(\d+)/,
    date:        /(\d{4})\/(\d{1,2})\/(\d{1,2})/,      // Jalali
    time:        /(\d{2}):(\d{2}):(\d{2})/,
    description: /(?:برداشت|واریز)\s+مبلغ\s+\d+\s+(.+)/,
  },
}
```

Reference SMS (Saman):

```
بانك سامان
برداشت مبلغ 9,926,000 انتقال وجه
از 2137-888-4747354-1
مانده 673,036,251
1405/5/16
11:38:58
```

Adding a bank: one file under `lib/sms/templates/`, register it in the index,
add fixtures. No changes elsewhere.

**Generic fallback** — when no template matches, the same field patterns run
without a bank anchor. Amount plus direction is sufficient to create a
transaction; anything less yields `needs_review`.

**Dates** — `jalaali-js` converts Jalali to Gregorian; the timezone is fixed to
`Asia/Tehran`. Missing or unparseable date falls back to the receive time.

**Noise** — OTP and advertising SMS match nothing and produce no amount, so they
are logged in `sms_log` with `parse_ok = false` and create no transaction.

**Contract** — `parse` never throws. It returns `null` or a validated object.

## 7. Webhook

```
POST /api/sms
Header: X-API-Key: <SMS_API_KEY>
Body:   { "text": "<raw sms body>", "sender": "<optional>" }

200 {"ok":true,"status":"parsed"|"needs_review"|"duplicate"}
401 bad or missing key
```

- Always returns 200 once authenticated, including on parse failure. An error
  banner on the phone mid-checkout is worse than a review row.
- Constant-time comparison for the API key.
- Rate limit: 60 requests/minute per IP.
- Dedupe: reject if the same `body_hash` appears in `sms_log` within 5 minutes;
  respond `duplicate`.
- Target latency under 20ms — local SQLite, a single insert.

**iOS Shortcut** — Automation → "When I get a message" from the bank sender →
Get Contents of URL → POST JSON → run without notification. One automation per
bank sender. Setup steps documented in the README.

## 8. UI

Three screens, bottom tab bar, dark by default, one-handed reach.

**Inbox** — uncategorized transactions, newest first. A `needs_review` group
pins to the top when non-empty. Tapping a row opens a bottom sheet (shadcn
Drawer) with a category grid of large touch targets. One tap categorizes,
closes the sheet, and animates the row out. A 5-second undo toast follows. No
confirm button.

**Month** — total for the month, a compact daily bar strip, and categories
sorted by spend. Arrows move between months. Tapping a category lists its
transactions.

**Add** — manual entry for cash purchases: amount, direction, category, note.
The same sheet component handles editing; long-pressing any row offers Edit and
Delete.

**PWA** — web manifest with `display: standalone`, apple-touch-icon,
`viewport-fit=cover`, dark `theme-color`. No offline write support in v1; the
Inbox tab label carries the count, since iOS PWAs cannot set an app badge.

**Auth** — `/login` posts a single password, compared against a bcrypt hash in
the environment, and sets a signed httpOnly `SameSite=Lax` cookie for one year.
Middleware guards every route except `/api/sms`, `/login`, and static assets.

## 9. Operations

- `docker compose up -d` runs the app and Caddy. Caddy issues TLS automatically.
- SQLite lives on a mounted volume in WAL mode. Drizzle migrations run at
  container start.
- Nightly cron takes an `sqlite3 .backup` snapshot, keeps 14 dated copies, and
  optionally pushes them off-box with rclone.
- The image is built locally and pushed to a registry, since the npm registry
  may be unreliable from an Iranian VPS.

Environment variables (`.env` on the server, never committed):
`SMS_API_KEY`, `APP_PASSWORD_HASH`, `COOKIE_SECRET`, `DATABASE_URL`.

## 10. Testing

Vitest.

- **Parser fixtures** are the core. `lib/sms/__fixtures__/` holds real SMS text
  files paired with expected JSON. One test iterates the directory. Every new
  format encountered becomes a fixture first.
- Dedupe window behavior at the boundary.
- Jalali to Gregorian conversion, including month and year boundaries.
- Auth middleware allow and deny paths.
- Webhook 401, parsed, needs_review, and duplicate responses.

UI has no automated tests in v1. There is one user and breakage is immediately
visible.

## 11. Out of scope for v1

Budgets per category, charts beyond the daily strip, a category management
screen, multi-account views, CSV export, offline sync, service worker caching,
internationalization, and any form of multi-user support.
