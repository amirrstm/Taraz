import bcrypt from 'bcryptjs'
import { expect, test, vi } from 'vitest'
import { LIMIT } from '@/lib/rate-limit'

// cookies() throws outside a real Next.js request scope ("called outside a
// request scope") — mock it so the success path can be exercised too, the
// same approach app/(app)/actions.test.ts uses for next/cache.
const cookieStore = new Map<string, unknown>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    set: (name: string, value: string, opts: unknown) => cookieStore.set(name, { value, opts }),
  }),
}))

const { POST } = await import('@/app/api/login/route')

const PASSWORD = 'correct horse battery staple'

process.env.APP_PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4)
process.env.COOKIE_SECRET = 'a'.repeat(32)

function post(password: string, ip: string): Request {
  const form = new URLSearchParams({ password })
  return new Request('http://localhost/api/login', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip, 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
}

test('accepts the correct password and redirects to /inbox', async () => {
  const res = await POST(post(PASSWORD, '10.0.0.1'))
  expect(res.status).toBe(303)
  expect(res.headers.get('location')).toContain('/inbox')
  expect(cookieStore.size).toBeGreaterThan(0)
})

test('rejects a wrong password by redirecting to /login?error=1', async () => {
  const res = await POST(post('nope', '10.0.0.2'))
  expect(res.status).toBe(303)
  expect(res.headers.get('location')).toContain('/login?error=1')
})

test('a flood of guesses from one IP gets rate-limited with 429', async () => {
  const ip = '10.0.0.3'
  let sawRateLimited = false
  for (let i = 0; i < LIMIT + 5; i++) {
    const res = await POST(post('nope', ip))
    if (res.status === 429) {
      sawRateLimited = true
      break
    }
    expect(res.status).toBe(303)
  }
  expect(sawRateLimited).toBe(true)
})

test('rate limiting is keyed per IP, not global', async () => {
  const res = await POST(post('nope', '10.0.0.4'))
  expect(res.status).toBe(303)
})

test('a missing APP_PASSWORD_HASH fails closed with 500, independent of rate limiting', async () => {
  const savedHash = process.env.APP_PASSWORD_HASH
  delete process.env.APP_PASSWORD_HASH
  try {
    const res = await POST(post(PASSWORD, '10.0.0.5'))
    expect(res.status).toBe(500)
  } finally {
    process.env.APP_PASSWORD_HASH = savedHash
  }
})
