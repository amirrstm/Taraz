import { rmSync } from 'node:fs'
import { afterAll, beforeAll, expect, test } from 'vitest'

const TEST_DB = './data/test-webhook.db'
let POST: (req: Request) => Promise<Response>

beforeAll(async () => {
  process.env.TURSO_DATABASE_URL = `file:${TEST_DB}`
  process.env.TURSO_AUTH_TOKEN = ''
  process.env.SMS_API_KEY = 'test-key'
  rmSync(TEST_DB, { force: true })
  const { migrate } = await import('drizzle-orm/libsql/migrator')
  const { getDb } = await import('@/lib/db/client')
  const { seedCategories } = await import('@/lib/db/seed')
  await migrate(getDb(), { migrationsFolder: './drizzle' })
  await seedCategories(getDb())
  ;({ POST } = await import('@/app/api/sms/route'))
})

afterAll(() => {
  for (const suffix of ['', '-wal', '-shm']) rmSync(`${TEST_DB}${suffix}`, { force: true })
})

function post(body: unknown, key = 'test-key', ip = '1.2.3.4') {
  return new Request('http://localhost/api/sms', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  })
}

const SAMAN = `بانك سامان
برداشت مبلغ 9,926,000 انتقال وجه
از 2137-888-4747354-1
مانده 673,036,251
1405/5/16
11:38:58`

test('rejects a missing key with 401', async () => {
  const res = await POST(post({ text: SAMAN }, ''))
  expect(res.status).toBe(401)
})

test('rejects a wrong key with 401', async () => {
  const res = await POST(post({ text: SAMAN }, 'wrong'))
  expect(res.status).toBe(401)
})

test('accepts and parses a valid message', async () => {
  const res = await POST(post({ text: SAMAN, sender: 'SAMAN' }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ ok: true, status: 'parsed' })
})

test('reports a duplicate on immediate resend', async () => {
  const res = await POST(post({ text: SAMAN, sender: 'SAMAN' }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ ok: true, status: 'duplicate' })
})

test('stores an unparseable message as needs_review with 200', async () => {
  const res = await POST(post({ text: 'کد ورود شما 12345 است' }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ ok: true, status: 'needs_review' })
})

test('returns 400 for a body with no text field', async () => {
  const res = await POST(post({ nope: 1 }))
  expect(res.status).toBe(400)
})

test('returns 400 for malformed JSON', async () => {
  const req = new Request('http://localhost/api/sms', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': 'test-key' },
    body: '{not json',
  })
  expect((await POST(req)).status).toBe(400)
})
