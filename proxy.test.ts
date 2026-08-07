import { NextRequest } from 'next/server'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { isExemptPath, proxy } from '@/proxy'

const ORIGINAL_SECRET = process.env.COOKIE_SECRET

beforeEach(() => {
  process.env.COOKIE_SECRET = 'a-test-secret-value'
})

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.COOKIE_SECRET
  else process.env.COOKIE_SECRET = ORIGINAL_SECRET
})

function req(path: string, cookie?: string): NextRequest {
  const headers = new Headers()
  if (cookie) headers.set('cookie', `taraz_session=${cookie}`)
  return new NextRequest(new URL(`http://localhost${path}`), { headers })
}

// --- Segment-anchored exemption checks -------------------------------------

test('exempts /api/sms exactly', () => {
  expect(isExemptPath('/api/sms')).toBe(true)
})

test('exempts /api/sms subpaths', () => {
  expect(isExemptPath('/api/sms/anything')).toBe(true)
})

test('exempts /login exactly', () => {
  expect(isExemptPath('/login')).toBe(true)
})

test('exempts /api/login and its subpaths', () => {
  expect(isExemptPath('/api/login')).toBe(true)
  expect(isExemptPath('/api/login/anything')).toBe(true)
})

test('exempts static asset prefixes', () => {
  expect(isExemptPath('/_next/static/chunk.js')).toBe(true)
  expect(isExemptPath('/_next/image/foo.png')).toBe(true)
  expect(isExemptPath('/icons/icon.png')).toBe(true)
  expect(isExemptPath('/manifest.webmanifest')).toBe(true)
  expect(isExemptPath('/favicon.ico')).toBe(true)
})

test('does NOT exempt a route that merely starts with an exempt name fragment', () => {
  expect(isExemptPath('/api/sms-export')).toBe(false)
  expect(isExemptPath('/login-history')).toBe(false)
  expect(isExemptPath('/iconsFOO')).toBe(false)
  expect(isExemptPath('/api/loginXYZ')).toBe(false)
})

test('does not exempt ordinary app routes', () => {
  expect(isExemptPath('/')).toBe(false)
  expect(isExemptPath('/inbox')).toBe(false)
  expect(isExemptPath('/month')).toBe(false)
  expect(isExemptPath('/add')).toBe(false)
})

// --- Fail-closed on missing/empty secret ------------------------------------

test('redirects to /login (not throws) when COOKIE_SECRET is unset, even with a well-formed forged cookie', async () => {
  delete process.env.COOKIE_SECRET
  const res = await proxy(req('/inbox', 'v1.9999999999999.deadbeef'))
  expect(res.status).toBe(307)
  expect(res.headers.get('location')).toBe('http://localhost/login')
})

test('redirects to /login when COOKIE_SECRET is an empty string', async () => {
  process.env.COOKIE_SECRET = ''
  const res = await proxy(req('/inbox', 'v1.9999999999999.deadbeef'))
  expect(res.status).toBe(307)
  expect(res.headers.get('location')).toBe('http://localhost/login')
})

// --- Guarded routes without a valid cookie ----------------------------------

for (const path of ['/', '/inbox', '/month', '/add', '//inbox', '/inbox/', '/INBOX', '/inbox%2f']) {
  test(`guards ${path} without a valid cookie`, async () => {
    const res = await proxy(req(path))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost/login')
  })
}

test('guards the resolved target of a traversal attempt through an exempt prefix', async () => {
  // The URL parser resolves `..` before the pathname reaches the proxy
  // (here to `/api/inbox`), so a traversal segment can never ride the
  // `/api/sms` exemption to reach an unguarded route.
  const res = await proxy(req('/api/sms/../inbox'))
  expect(res.status).toBe(307)
  expect(res.headers.get('location')).toBe('http://localhost/login')
})

// --- Exempt routes pass through untouched -----------------------------------

test('lets /api/sms through without any cookie', async () => {
  const res = await proxy(req('/api/sms'))
  expect(res.status).toBe(200)
  expect(res.headers.get('location')).toBeNull()
})

test('lets /login through without any cookie', async () => {
  const res = await proxy(req('/login'))
  expect(res.status).toBe(200)
  expect(res.headers.get('location')).toBeNull()
})
