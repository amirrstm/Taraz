import { rmSync } from 'node:fs'
import { afterAll, beforeAll, expect, test, vi } from 'vitest'

// Server actions call revalidatePath, which throws outside a real Next.js
// request ("Invariant: static generation store missing") — mock it so the
// success paths can be exercised too, not just the rejections.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const TEST_DB = './data/test-app-actions.db'
let actions: typeof import('@/app/(app)/actions')
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
  actions = await import('@/app/(app)/actions')
})

afterAll(() => {
  for (const suffix of ['', '-wal', '-shm']) rmSync(`${TEST_DB}${suffix}`, { force: true })
})

const NOW = Date.parse('2026-08-07T08:00:00Z')

async function makeTx(overrides: Partial<Parameters<typeof q.insertManual>[0]> = {}): Promise<number> {
  return q.insertManual({
    amount: 1000,
    direction: 'debit',
    categoryId: null,
    note: null,
    occurredAt: NOW,
    ...overrides,
  })
}

test('categorizeAction rejects a nonexistent transaction', async () => {
  const cat = (await q.listCategories())[0]
  const result = await actions.categorizeAction(999_999, cat.id)
  expect(result).toEqual({ ok: false, error: 'Transaction not found.' })
})

test('categorizeAction rejects a nonexistent category', async () => {
  const txId = await makeTx()
  const result = await actions.categorizeAction(txId, 999_999)
  expect(result).toEqual({ ok: false, error: 'Category not found.' })
  expect((await q.listInbox()).some((t) => t.id === txId && t.status === 'uncategorized')).toBe(true)
})

test('categorizeAction succeeds for a valid transaction and category', async () => {
  const cat = (await q.listCategories())[0]
  const txId = await makeTx()
  const result = await actions.categorizeAction(txId, cat.id)
  expect(result).toEqual({ ok: true })
  expect((await q.listInbox()).some((t) => t.id === txId)).toBe(false)
})

test('uncategorizeAction rejects a nonexistent transaction', async () => {
  const result = await actions.uncategorizeAction(999_999)
  expect(result).toEqual({ ok: false, error: 'Transaction not found.' })
})

test('deleteAction rejects a nonexistent transaction', async () => {
  const result = await actions.deleteAction(999_999)
  expect(result).toEqual({ ok: false, error: 'Transaction not found.' })
})

test('deleteAction succeeds for an existing transaction', async () => {
  const txId = await makeTx()
  const result = await actions.deleteAction(txId)
  expect(result).toEqual({ ok: true })
  expect(await q.getTransactionById(txId)).toBeUndefined()
})

test.each([0, -5, 4.5, NaN, Infinity, -Infinity])(
  'editAction rejects amount %p as not a positive integer',
  async (amount) => {
    const txId = await makeTx()
    const result = await actions.editAction(txId, { amount })
    expect(result).toEqual({ ok: false, error: 'Amount must be a positive integer.' })
  },
)

test('editAction accepts a positive integer amount', async () => {
  const txId = await makeTx()
  const result = await actions.editAction(txId, { amount: 42_000 })
  expect(result).toEqual({ ok: true })
  expect((await q.getTransactionById(txId))?.amount).toBe(42_000)
})

test('editAction rejects an amount past Number.MAX_SAFE_INTEGER and leaves the row unchanged', async () => {
  const txId = await makeTx({ amount: 5000 })
  const result = await actions.editAction(txId, { amount: Number.MAX_SAFE_INTEGER + 1 })
  expect(result).toEqual({ ok: false, error: 'Amount must be a positive integer.' })
  // The "unchanged afterward" half matters: a rejected write that still
  // mutated the row would be this bug wearing a different hat. Also,
  // Number.MAX_SAFE_INTEGER + 1 is unsafe to read back from libsql once
  // written, so a passing read here is itself proof nothing was written.
  expect((await q.getTransactionById(txId))?.amount).toBe(5000)
})

test('editAction accepts Number.MAX_SAFE_INTEGER itself (no overcorrection)', async () => {
  const txId = await makeTx()
  const result = await actions.editAction(txId, { amount: Number.MAX_SAFE_INTEGER })
  expect(result).toEqual({ ok: true })
  expect((await q.getTransactionById(txId))?.amount).toBe(Number.MAX_SAFE_INTEGER)
})

test('editAction rejects a nonexistent transaction', async () => {
  const result = await actions.editAction(999_999, { amount: 1000 })
  expect(result).toEqual({ ok: false, error: 'Transaction not found.' })
})

test('editAction rejects a nonexistent category', async () => {
  const txId = await makeTx()
  const result = await actions.editAction(txId, { categoryId: 999_999 })
  expect(result).toEqual({ ok: false, error: 'Category not found.' })
})

test('editAction allows clearing the category with null', async () => {
  const cat = (await q.listCategories())[0]
  const txId = await makeTx({ categoryId: cat.id })
  const result = await actions.editAction(txId, { categoryId: null })
  expect(result).toEqual({ ok: true })
  expect((await q.getTransactionById(txId))?.categoryId).toBeNull()
})

test('addManualAction rejects a non-positive-integer amount', async () => {
  const result = await actions.addManualAction({
    amount: 0,
    direction: 'debit',
    categoryId: null,
    note: null,
  })
  expect(result).toEqual({ ok: false, error: 'Amount must be a positive integer.' })
})

test('addManualAction rejects a nonexistent category', async () => {
  const result = await actions.addManualAction({
    amount: 1000,
    direction: 'debit',
    categoryId: 999_999,
    note: null,
  })
  expect(result).toEqual({ ok: false, error: 'Category not found.' })
})

test('categorizeAction rejects a non-finite transaction id instead of throwing', async () => {
  const cat = (await q.listCategories())[0]
  const result = await actions.categorizeAction(NaN, cat.id)
  expect(result).toEqual({ ok: false, error: 'Invalid id.' })
})

test('editAction rejects an empty patch instead of throwing', async () => {
  const txId = await makeTx()
  const result = await actions.editAction(txId, {})
  expect(result).toEqual({ ok: false, error: 'No changes given.' })
})

test('editAction rejects a patch with only amount:undefined instead of throwing', async () => {
  const txId = await makeTx()
  const result = await actions.editAction(txId, { amount: undefined })
  expect(result).toEqual({ ok: false, error: 'No changes given.' })
})

test('addManualAction rejects an invalid direction', async () => {
  const result = await actions.addManualAction({
    amount: 1000,
    // @ts-expect-error deliberately invalid at the type boundary
    direction: 'sideways',
    categoryId: null,
    note: null,
  })
  expect(result).toEqual({ ok: false, error: 'Direction must be debit or credit.' })
})

test('addManualAction rejects a note over the length cap', async () => {
  const result = await actions.addManualAction({
    amount: 1000,
    direction: 'debit',
    categoryId: null,
    note: 'x'.repeat(501),
  })
  expect(result).toEqual({ ok: false, error: 'Note is too long.' })
})

test('editAction writes a note onto an existing transaction', async () => {
  const txId = await makeTx()
  expect(await actions.editAction(txId, { note: 'Lunch with Kiana' })).toEqual({ ok: true })
  expect((await q.getTransactionById(txId))?.note).toBe('Lunch with Kiana')
})

test('editAction clears a note when given null', async () => {
  const txId = await makeTx({ note: 'to be removed' })
  expect(await actions.editAction(txId, { note: null })).toEqual({ ok: true })
  expect((await q.getTransactionById(txId))?.note).toBeNull()
})

test('editAction rejects a note over the length cap', async () => {
  const txId = await makeTx()
  const result = await actions.editAction(txId, { note: 'x'.repeat(501) })
  expect(result).toEqual({ ok: false, error: 'Note is too long.' })
})

test('editAction saves an amount and a note together', async () => {
  const txId = await makeTx()
  expect(await actions.editAction(txId, { amount: 2500, note: 'split bill' })).toEqual({ ok: true })
  const tx = await q.getTransactionById(txId)
  expect(tx?.amount).toBe(2500)
  expect(tx?.note).toBe('split bill')
})

test('editAction rejects an invalid direction', async () => {
  const txId = await makeTx()
  // @ts-expect-error deliberately invalid at the type boundary
  const result = await actions.editAction(txId, { direction: 'sideways' })
  expect(result).toEqual({ ok: false, error: 'Direction must be debit or credit.' })
})

test('addManualAction succeeds with valid input', async () => {
  const cat = (await q.listCategories())[0]
  const result = await actions.addManualAction({
    amount: 1000,
    direction: 'debit',
    categoryId: cat.id,
    note: null,
  })
  expect(result).toEqual({ ok: true })
})
