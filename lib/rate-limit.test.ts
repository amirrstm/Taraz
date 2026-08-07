import { expect, test } from 'vitest'
import { allow, LIMIT } from '@/lib/rate-limit'

test('allows requests up to the limit', () => {
  const now = 1_000_000
  for (let i = 0; i < LIMIT; i++) expect(allow('a', now)).toBe(true)
})

test('blocks the request past the limit', () => {
  const now = 1_000_000
  expect(allow('a', now)).toBe(false)
})

test('resets after the window', () => {
  expect(allow('a', 1_000_000 + 61_000)).toBe(true)
})

test('tracks keys independently', () => {
  expect(allow('b', 1_000_000)).toBe(true)
})
