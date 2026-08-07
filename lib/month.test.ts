import { rmSync } from 'node:fs'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { monthRange } from '@/lib/month'

test('returns the Iran-local bounds of a month', () => {
  const { startMs, endMs } = monthRange(2026, 8)
  expect(new Date(startMs).toISOString()).toBe('2026-07-31T20:30:00.000Z')
  expect(new Date(endMs).toISOString()).toBe('2026-08-31T20:30:00.000Z')
})

test('rolls over at the end of the year', () => {
  const { endMs } = monthRange(2026, 12)
  expect(new Date(endMs).toISOString()).toBe('2026-12-31T20:30:00.000Z')
})

test('handles February in a leap year', () => {
  const { endMs } = monthRange(2028, 2)
  expect(new Date(endMs).toISOString()).toBe('2028-02-29T20:30:00.000Z')
})

// The daily breakdown in monthSummary buckets by Iran-local day. These
// integration tests prove the window from monthRange lines up with that
// bucketing at both edges of the month, where a naive UTC window would
// either drop the transaction or bucket it into the wrong day.
const TEST_DB = './data/test-month.db'
let q: typeof import('@/lib/db/queries')

beforeAll(async () => {
  process.env.TURSO_DATABASE_URL = `file:${TEST_DB}`
  process.env.TURSO_AUTH_TOKEN = ''
  rmSync(TEST_DB, { force: true })
  const { migrate } = await import('drizzle-orm/libsql/migrator')
  const { getDb } = await import('@/lib/db/client')
  const { seedCategories } = await import('@/lib/db/seed')
  await migrate(getDb(), { migrationsFolder: './drizzle' })
  await seedCategories(getDb())
  q = await import('@/lib/db/queries')
})

afterAll(() => {
  for (const suffix of ['', '-wal', '-shm']) rmSync(`${TEST_DB}${suffix}`, { force: true })
})

test('includes a transaction at 00:30 Tehran on the 1st, bucketed as day 1', async () => {
  const cat = (await q.listCategories())[0]
  // 2026-07-31T21:00:00Z is 2026-08-01T00:30:00 in Tehran (UTC+03:30).
  const occurredAt = Date.parse('2026-07-31T21:00:00Z')
  await q.insertManual({
    amount: 50000, direction: 'debit', categoryId: cat.id, note: null, occurredAt,
  })

  const { startMs, endMs } = monthRange(2026, 8)
  const summary = await q.monthSummary(startMs, endMs)

  expect(summary.total).toBeGreaterThanOrEqual(50000)
  expect(summary.daily.find((d) => d.day === 1)?.total).toBe(50000)
})

test('includes a transaction at 23:30 Tehran on the last day, bucketed as day 31', async () => {
  const cat = (await q.listCategories())[0]
  // 2026-08-31T20:00:00Z is 2026-08-31T23:30:00 in Tehran (UTC+03:30).
  const occurredAt = Date.parse('2026-08-31T20:00:00Z')
  await q.insertManual({
    amount: 70000, direction: 'debit', categoryId: cat.id, note: null, occurredAt,
  })

  const { startMs, endMs } = monthRange(2026, 8)
  const summary = await q.monthSummary(startMs, endMs)

  expect(summary.daily.find((d) => d.day === 31)?.total).toBe(70000)
})

// This is the invariant a user checks by eye when they tap a category row:
// the drill-down list must sum to exactly the total shown for that category.
// It only holds if the drill-down uses the same Iran-local window as the
// summary; a mismatched window would silently include/exclude transactions
// at the month edges and this total would drift from what's displayed.
test('listByCategory for a month sums to exactly the byCategory total for that month', async () => {
  const cat = (await q.listCategories()).find((c) => c.name === 'Groceries')!

  await q.insertManual({
    amount: 30000, direction: 'debit', categoryId: cat.id, note: null,
    occurredAt: Date.parse('2026-09-05T10:00:00Z'),
  })
  await q.insertManual({
    amount: 45000, direction: 'debit', categoryId: cat.id, note: null,
    // 2026-09-30T21:00:00Z is 2026-10-01T00:30 Tehran: outside September.
    occurredAt: Date.parse('2026-09-29T18:00:00Z'),
  })
  // Just inside the Iran-local end of September (2026-10-01T00:00 Tehran
  // == 2026-09-30T20:30:00Z).
  await q.insertManual({
    amount: 15000, direction: 'debit', categoryId: cat.id, note: null,
    occurredAt: Date.parse('2026-09-30T20:00:00Z'),
  })
  // Falls in October instead: must not be included.
  await q.insertManual({
    amount: 999000, direction: 'debit', categoryId: cat.id, note: null,
    occurredAt: Date.parse('2026-09-30T21:00:00Z'),
  })

  const { startMs, endMs } = monthRange(2026, 9)
  const summary = await q.monthSummary(startMs, endMs)
  const items = await q.listByCategory(startMs, endMs, cat.id)

  const categoryTotal = summary.byCategory.find((c) => c.categoryId === cat.id)?.total
  const listedTotal = items
    .filter((t) => t.direction === 'debit')
    .reduce((sum, t) => sum + t.amount, 0)

  expect(categoryTotal).toBe(90000)
  expect(listedTotal).toBe(categoryTotal)
})
