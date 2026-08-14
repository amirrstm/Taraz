# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev                      # Next.js dev server
pnpm build                    # production build
pnpm test                     # vitest run (all *.test.ts)
pnpm test:watch
pnpm exec tsc --noEmit        # typecheck

pnpm exec vitest run lib/sms/parse.test.ts        # single file
pnpm exec vitest run -t 'isDuplicate'             # single test by name

pnpm db:generate              # drizzle-kit generate → new SQL under drizzle/ (after editing lib/db/schema.ts)
pnpm db:migrate               # tsx lib/db/migrate.ts — applies migrations + seeds categories
```

Package manager is **pnpm** (`packageManager` pinned). Never let a
`package-lock.json` appear at the root — Vercel picks its package manager from
whichever lockfile it finds.

Migrations are never run at request time. `pnpm db:migrate` is invoked by hand
from a dev machine, including against production Turso by prefixing
`TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=...`.

## What this is

Single-user PWA that tracks Iranian bank expenses. An iOS Shortcut POSTs bank
SMS to `/api/sms`; the app parses it, dedupes it, and shows it in the Inbox;
the user taps a category to turn it into a categorized transaction.

## Architecture

**Ingest pipeline** — one path from raw text to stored row, shared by the
webhook and the Paste SMS screen so they behave identically:

```
raw SMS → lib/ingest.ts ingestSms()
            ├─ hashBody + isDuplicate (5-minute window) → 'duplicate'
            ├─ lib/sms/parse.ts parse()
            │     └─ lib/sms/normalize.ts normalize()  (Persian/Arabic digits → ASCII,
            │        ك→ک, ي/ى→ی, strip bidi/zero-width, drop digit separators)
            │     └─ lib/sms/templates/* matched in order, GENERIC fallback last
            │     └─ lib/sms/jalali.ts jalaliToUnixMs()
            ├─ parsed  → insertParsed  → status 'uncategorized' → 'parsed'
            └─ null    → insertNeedsReview → status 'needs_review'
```

Templates are **data, not code** (`BankTemplate` in `lib/sms/types.ts`):
regexes for direction/amount/account/balance/date/time/description. Adding a
bank = fixture pair in `lib/sms/__fixtures__/` (`<bank>-<case>.txt` +
`.json`), a template file modeled on `saman.ts`, registration in
`templates/index.ts`. `lib/sms/fixtures.test.ts` drives all fixtures
automatically. `parse()` and `normalize()` never throw — they return
`null`/`''`.

**Auth** — `proxy.ts` (Next.js proxy/middleware) gates everything except the
paths in `EXEMPT_EXACT`/`EXEMPT_PREFIXES` (`/login`, `/api/login`, `/api/sms`,
static). Session is an HMAC cookie `v1.<expiresAt>.<hmac>` from
`lib/auth/cookie.ts`, signed with `COOKIE_SECRET` via Web Crypto (must work on
the edge). Any verification throw is caught and treated as unauthenticated.
`/api/sms` uses a separate `X-API-Key` shared secret compared with
sha256+`timingSafeEqual` (both sides hashed so timing doesn't leak key
length), plus `lib/rate-limit.ts`.

**Routes** — `app/(app)/` is the authenticated group with `TabBar` and
`force-dynamic`; `app/(app)/actions.ts` holds all server actions. Actions
return `ActionResult` (`{ok:false, error}`) rather than throwing, and validate
every input at the boundary — they are POST-reachable behind only the session
cookie. Mutations call a shared `revalidateAll()` that includes the dynamic
segment template `revalidatePath('/month/category/[id]', 'page')`.

**Data** — Drizzle over libSQL, `lib/db/client.ts` caches one instance per
process; `file:` URL locally/tests, `libsql://` on Vercel, and callers cannot
tell them apart. Schema in `lib/db/schema.ts`, all SQL in `lib/db/queries.ts`.
Status is derived from `categoryId` inside the queries, never set by callers.

**UI** — server pages fetch, small `'use client'` leaves take props. Category
picking uses a vaul `Drawer` (`components/CategorySheet.tsx`). `TransactionCard`
formats Tehran time by shifting ms and reading UTC fields, deliberately
avoiding `Intl`/`toLocaleString` so SSR and the phone can't disagree.
`UndoToast` must be remounted with a `key` per toast so the old timer clears.

## Invariants

- **Money is integer rial** everywhere in the DB and in `ParsedSms`. Toman is
  a display/input unit only: `formatToman` (÷10) and `parseTomanInput` (×10)
  in `lib/money.ts`.
- Amounts must be **positive safe integers**. Values ≥ 2^53 make the libsql
  driver throw `RangeError` on read, so `isValidAmount` rejects them.
- **Timestamps are unix ms UTC**, but every calendar boundary is Iran-local
  (UTC+03:30). Use `monthRange`/`currentYearMonth` from `lib/month.ts`, not
  `getUTCMonth()` on the raw ms — the ~3.5h gap otherwise misbuckets rows.
- Dedupe is `hashBody(rawText)` within a **5-minute** window; re-pasting an
  already-ingested SMS reports "Already recorded" instead of duplicating.
- Template regexes run against **normalized** text, so they may assume ASCII
  digits and Persian letter forms.
- `monthSummary` counts only `direction='debit'` **and** `status='categorized'`
  — uncategorized spend is intentionally invisible until triaged.
- Nothing is ever lost: an unparsed SMS still gets a `needs_review` transaction
  plus its raw text in `sms_log`; duplicates get a log row with
  `error='duplicate'`.
- Auth fails closed; `parse`/`normalize`/server actions never throw.

## Tests

Vitest, `environment: 'node'`, `@` aliased to the repo root. `include` is
`**/*.test.ts` only — `.tsx` components are untested by design. Tests are
colocated with source. DB-touching
suites set `TURSO_DATABASE_URL` to their **own** `./data/test-*.db` file in
`beforeAll`, then `await import()` the modules under test (the import must
come after the env var, because `getDb()` caches), migrate, seed, and `rmSync`
the `.db`/`-wal`/`-shm` files in `afterAll`. Follow that pattern for any new
DB test.

## Local env gotcha

Next.js's `.env` loader does `$`-expansion, so a bcrypt `APP_PASSWORD_HASH`
must be written with every `$` escaped (`\$2a\$10\$...`) in a local `.env`.
Vercel's UI stores values literally — paste it unescaped there. Login failing
locally with the correct password is almost always this.

## Reference

`README.md` covers deployment (Vercel + Turso), the iOS Shortcut setup,
`scripts/backup.sh`, and the first-run verification checklist. Design spec and
original plan are under `docs/superpowers/`.
