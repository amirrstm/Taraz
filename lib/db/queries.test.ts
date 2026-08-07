import { rmSync } from 'node:fs'
import { afterAll, beforeAll, expect, test } from 'vitest'

const TEST_DB = './data/test-queries.db'
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

const NOW = Date.parse('2026-08-07T08:00:00Z')

test('hashBody is stable and differs by content', () => {
  expect(q.hashBody('a')).toBe(q.hashBody('a'))
  expect(q.hashBody('a')).not.toBe(q.hashBody('b'))
})

test('isDuplicate is false for an unseen hash', async () => {
  expect(await q.isDuplicate('never-seen', NOW)).toBe(false)
})

test('isDuplicate is true within the five minute window', async () => {
  await q.logSms({ rawText: 'x', bodyHash: 'h1', sender: null, receivedAt: NOW, parseOk: true })
  expect(await q.isDuplicate('h1', NOW + 4 * 60_000)).toBe(true)
})

test('isDuplicate is false outside the five minute window', async () => {
  expect(await q.isDuplicate('h1', NOW + 6 * 60_000)).toBe(false)
})

test('insertParsed creates an uncategorized transaction', async () => {
  const logId = await q.logSms({
    rawText: 'y', bodyHash: 'h2', sender: null, receivedAt: NOW, parseOk: true,
  })
  const id = await q.insertParsed(
    {
      bankId: 'saman', amount: 9926000, direction: 'debit', accountTail: '1',
      balanceAfter: 673036251, occurredAt: NOW, description: 'انتقال وجه',
    },
    logId,
    NOW,
  )
  const row = (await q.listInbox()).find((t) => t.id === id)
  expect(row?.status).toBe('uncategorized')
  expect(row?.amount).toBe(9926000)
  expect(row?.categoryName).toBeNull()
})

test('insertParsed falls back to receivedAt when occurredAt is null', async () => {
  const logId = await q.logSms({
    rawText: 'z', bodyHash: 'h3', sender: null, receivedAt: NOW, parseOk: true,
  })
  const id = await q.insertParsed(
    {
      bankId: null, amount: 1000, direction: 'credit', accountTail: null,
      balanceAfter: null, occurredAt: null, description: null,
    },
    logId,
    NOW,
  )
  expect((await q.listInbox()).find((t) => t.id === id)?.occurredAt).toBe(NOW)
})

test('insertNeedsReview creates a zero-amount review row', async () => {
  const logId = await q.logSms({
    rawText: 'junk', bodyHash: 'h4', sender: null, receivedAt: NOW, parseOk: false,
    error: 'unparsed',
  })
  const id = await q.insertNeedsReview(logId, NOW)
  const row = (await q.listInbox()).find((t) => t.id === id)
  expect(row?.status).toBe('needs_review')
  expect(row?.amount).toBe(0)
})

test('setCategory moves a transaction out of the inbox', async () => {
  const cat = (await q.listCategories())[0]
  const target = (await q.listInbox()).find((t) => t.status === 'uncategorized')!
  await q.setCategory(target.id, cat.id)
  expect((await q.listInbox()).some((t) => t.id === target.id)).toBe(false)
})

test('clearCategory returns a transaction to the inbox', async () => {
  const cat = (await q.listCategories())[0]
  const id = await q.insertManual({
    amount: 5000, direction: 'debit', categoryId: cat.id, note: null, occurredAt: NOW,
  })
  await q.clearCategory(id)
  expect((await q.listInbox()).some((t) => t.id === id)).toBe(true)
})

test('monthSummary totals only categorized debits in range', async () => {
  const cat = (await q.listCategories()).find((c) => c.name === 'Dining')!
  await q.insertManual({
    amount: 200000, direction: 'debit', categoryId: cat.id, note: null, occurredAt: NOW,
  })
  await q.insertManual({
    amount: 900000, direction: 'credit', categoryId: cat.id, note: null, occurredAt: NOW,
  })
  const start = Date.parse('2026-08-01T00:00:00Z')
  const end = Date.parse('2026-09-01T00:00:00Z')
  const summary = await q.monthSummary(start, end)
  const dining = summary.byCategory.find((c) => c.name === 'Dining')!
  expect(dining.total).toBe(200000)
  expect(summary.daily.length).toBeGreaterThan(0)
})

test('updateTransaction changes the amount', async () => {
  const id = await q.insertManual({
    amount: 1000, direction: 'debit', categoryId: null, note: null, occurredAt: NOW,
  })
  await q.updateTransaction(id, { amount: 2000, note: 'fixed' })
  expect((await q.listInbox()).find((t) => t.id === id)?.amount).toBe(2000)
})

test('deleteTransaction removes the row', async () => {
  const id = await q.insertManual({
    amount: 1000, direction: 'debit', categoryId: null, note: null, occurredAt: NOW,
  })
  await q.deleteTransaction(id)
  expect((await q.listInbox()).some((t) => t.id === id)).toBe(false)
})
