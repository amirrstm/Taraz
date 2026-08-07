import { expect, test } from 'vitest'
import { signSession, verifySession } from '@/lib/auth/cookie'

const SECRET = 'a-test-secret-value'
const NOW = 1_800_000_000_000

test('a freshly signed cookie verifies', async () => {
  const value = await signSession(NOW + 1000, SECRET)
  expect(await verifySession(value, SECRET, NOW)).toBe(true)
})

test('an expired cookie fails', async () => {
  const value = await signSession(NOW - 1, SECRET)
  expect(await verifySession(value, SECRET, NOW)).toBe(false)
})

test('a cookie signed with another secret fails', async () => {
  const value = await signSession(NOW + 1000, 'other-secret')
  expect(await verifySession(value, SECRET, NOW)).toBe(false)
})

test('a tampered expiry fails', async () => {
  const value = await signSession(NOW + 1000, SECRET)
  const [, , sig] = value.split('.')
  expect(await verifySession(`v1.${NOW + 999_999}.${sig}`, SECRET, NOW)).toBe(false)
})

test('undefined fails', async () => {
  expect(await verifySession(undefined, SECRET, NOW)).toBe(false)
})

test('garbage fails', async () => {
  expect(await verifySession('nonsense', SECRET, NOW)).toBe(false)
})

test('an empty secret fails closed instead of throwing, even against a well-formed forged cookie', async () => {
  await expect(verifySession('v1.9999999999999.deadbeef', '', NOW)).resolves.toBe(false)
})

test('a well-formed forged cookie fails against a real secret', async () => {
  await expect(verifySession('v1.9999999999999.deadbeef', SECRET, NOW)).resolves.toBe(false)
})
