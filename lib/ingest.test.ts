import { rmSync } from 'node:fs'
import { afterAll, beforeAll, expect, test } from 'vitest'

const TEST_DB = './data/test-ingest.db'
let ingestSms: typeof import('@/lib/ingest')['ingestSms']

beforeAll(async () => {
  process.env.TURSO_DATABASE_URL = `file:${TEST_DB}`
  process.env.TURSO_AUTH_TOKEN = ''
  rmSync(TEST_DB, { force: true })
  const { migrate } = await import('drizzle-orm/libsql/migrator')
  const { getDb } = await import('@/lib/db/client')
  const { seedCategories } = await import('@/lib/db/seed')
  await migrate(getDb(), { migrationsFolder: './drizzle' })
  await seedCategories(getDb())
  ;({ ingestSms } = await import('@/lib/ingest'))
})

afterAll(() => {
  for (const suffix of ['', '-wal', '-shm']) rmSync(`${TEST_DB}${suffix}`, { force: true })
})

const SAMAN = `بانك سامان
برداشت مبلغ 9,926,000 انتقال وجه
از 2137-888-4747354-1
مانده 673,036,251
1405/5/16
11:38:58`

const NOW = Date.parse('2026-08-07T08:00:00Z')

test('a parseable message is stored as parsed', async () => {
  expect(await ingestSms(SAMAN, 'SAMAN', NOW)).toBe('parsed')
})

test('the same message within the window is a duplicate', async () => {
  expect(await ingestSms(SAMAN, 'SAMAN', NOW + 60_000)).toBe('duplicate')
})

test('the same message after the window is accepted again', async () => {
  expect(await ingestSms(SAMAN, 'SAMAN', NOW + 10 * 60_000)).toBe('parsed')
})

test('an unparseable message becomes needs_review', async () => {
  expect(await ingestSms('کد ورود شما 12345 است', null, NOW)).toBe('needs_review')
})
