import { rmSync } from 'node:fs'
import { afterAll, beforeAll, expect, test } from 'vitest'

const TEST_DB = './data/test-ingest.db'
let ingestSms: typeof import('@/lib/ingest')['ingestSms']
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
  ;({ ingestSms } = await import('@/lib/ingest'))
  q = await import('@/lib/db/queries')
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

test('an unparseable message that could still be money becomes needs_review', async () => {
  // Money words but no readable amount: might be a real transaction in a
  // format we do not know yet, so it goes to the Inbox rather than being lost.
  expect(await ingestSms('بانك سامان برداشت از حساب انجام شد', null, NOW)).toBe('needs_review')
})

test('a login code message is ignored rather than sent for review', async () => {
  expect(await ingestSms('کد ورود شما 12345 است', null, NOW)).toBe('ignored')
})

test('a portal login notification is ignored', async () => {
  const login = `بانک سامان
ورود به درگاه بانکي
1405/5/18
14:09:56`
  expect(await ingestSms(login, 'SAMAN', NOW)).toBe('ignored')
})

test('a purchase password is ignored and creates no transaction', async () => {
  // This message repeats the amount of the purchase it authorizes, so treating
  // it as a transaction would double-count the spend.
  const otp = `بانک سامان
خريد
کانون سردفتران
مبلغ 473,000 ريال
رمز 685736
زمان اعتبار رمز 13:32:20`

  const before = (await q.listInbox()).length
  expect(await ingestSms(otp, 'SAMAN', NOW)).toBe('ignored')
  expect((await q.listInbox()).length).toBe(before)
})

test('an ignored message is still logged, so nothing is lost', async () => {
  const { getDb } = await import('@/lib/db/client')
  const { smsLog } = await import('@/lib/db/schema')
  const rows = await getDb().select().from(smsLog)
  expect(rows.some((r) => r.error === 'ignored')).toBe(true)
})
