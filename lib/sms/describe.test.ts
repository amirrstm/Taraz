import { expect, test } from 'vitest'
import { describe as describeSms } from '@/lib/sms/describe'

test('translates the common transfer purpose', () => {
  expect(describeSms('انتقال وجه')).toBe('Transfer')
})

test('prefers the longer match over the shorter one it contains', () => {
  expect(describeSms('خرید اینترنتی')).toBe('Online purchase')
  expect(describeSms('انتقال وجه پایا')).toBe('Paya transfer')
})

test('matches a purpose embedded in a longer string', () => {
  expect(describeSms('برداشت از خودپرداز')).toBe('Withdrawal')
})

test('normalizes Arabic letter forms and Persian digits before matching', () => {
  // 'ي' (Arabic yeh) rather than 'ی' (Persian yeh) — the same word as typed by
  // a different bank.
  expect(describeSms('خريد اينترنتي')).toBe('Online purchase')
})

test('passes Latin text through unchanged', () => {
  expect(describeSms('SNAPP')).toBe('SNAPP')
})

test('returns null for untranslatable Persian rather than showing it', () => {
  expect(describeSms('یک عبارت ناشناخته')).toBeNull()
})

test('returns null for null, empty and whitespace-only input', () => {
  expect(describeSms(null)).toBeNull()
  expect(describeSms('')).toBeNull()
  expect(describeSms('   ')).toBeNull()
})
