import { expect, test } from 'vitest'
import { normalize } from '@/lib/sms/normalize'

test('converts Persian digits to ASCII', () => {
  expect(normalize('۱۲۳۴۵۶۷۸۹۰')).toBe('1234567890')
})

test('converts Arabic-Indic digits to ASCII', () => {
  expect(normalize('٩٩٢٦')).toBe('9926')
})

test('unifies Arabic kaf and yeh to Persian forms', () => {
  expect(normalize('بانك سامان')).toBe('بانک سامان')
  expect(normalize('واريز')).toBe('واریز')
})

test('strips thousands separators inside numbers', () => {
  expect(normalize('9,926,000')).toBe('9926000')
  expect(normalize('673٬036٬251')).toBe('673036251')
})

test('keeps a comma that is not a thousands separator', () => {
  expect(normalize('a, b')).toBe('a, b')
})

test('removes zero-width non-joiner and control characters', () => {
  expect(normalize('می‌شود')).toBe('میشود')
  expect(normalize('a‎b')).toBe('ab')
})

test('collapses runs of spaces and tabs but keeps newlines', () => {
  expect(normalize('a   \t b')).toBe('a b')
  expect(normalize('a\r\nb')).toBe('a\nb')
})

test('trims leading and trailing whitespace', () => {
  expect(normalize('  hi  ')).toBe('hi')
})

test('returns an empty string for an empty input', () => {
  expect(normalize('')).toBe('')
})
