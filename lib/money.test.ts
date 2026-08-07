import { expect, test } from 'vitest'
import { formatToman, parseTomanInput } from '@/lib/money'

test('converts rial to toman with separators', () => {
  expect(formatToman(9926000)).toBe('992,600')
})

test('rounds sub-toman remainders', () => {
  expect(formatToman(15)).toBe('2')
})

test('formats zero', () => {
  expect(formatToman(0)).toBe('0')
})

test('parseTomanInput accepts ASCII digits', () => {
  expect(parseTomanInput('4000')).toBe(40000)
})

test('parseTomanInput accepts Persian digits', () => {
  expect(parseTomanInput('۴۰۰۰')).toBe(40000)
})

test('parseTomanInput accepts Arabic-Indic digits', () => {
  expect(parseTomanInput('٤٠٠٠')).toBe(40000)
})

test('parseTomanInput strips thousands separators', () => {
  expect(parseTomanInput('4,000,000')).toBe(40000000)
})

test('parseTomanInput rejects an empty string', () => {
  expect(parseTomanInput('')).toBeNull()
})

test('parseTomanInput rejects whitespace only', () => {
  expect(parseTomanInput('   ')).toBeNull()
})

test('parseTomanInput rejects non-numeric input', () => {
  expect(parseTomanInput('abc')).toBeNull()
})

test('parseTomanInput rejects zero', () => {
  expect(parseTomanInput('0')).toBeNull()
})

test('parseTomanInput rejects a negative amount', () => {
  expect(parseTomanInput('-5000')).toBeNull()
})

test('parseTomanInput rejects a value past Number.MAX_SAFE_INTEGER', () => {
  expect(parseTomanInput(String(Number.MAX_SAFE_INTEGER + 1))).toBeNull()
})

test('parseTomanInput accepts Number.MAX_SAFE_INTEGER itself', () => {
  expect(parseTomanInput(String(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER * 10)
})
