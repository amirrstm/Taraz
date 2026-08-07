import { expect, test } from 'vitest'
import { formatToman } from '@/lib/money'

test('converts rial to toman with separators', () => {
  expect(formatToman(9926000)).toBe('992,600')
})

test('rounds sub-toman remainders', () => {
  expect(formatToman(15)).toBe('2')
})

test('formats zero', () => {
  expect(formatToman(0)).toBe('0')
})
