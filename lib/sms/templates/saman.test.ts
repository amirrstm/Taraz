import { expect, test } from 'vitest'
import { normalize } from '@/lib/sms/normalize'
import { saman } from '@/lib/sms/templates/saman'

const SMS = normalize(`بانك سامان
برداشت مبلغ 9,926,000 انتقال وجه
از 2137-888-4747354-1
مانده 673,036,251
1405/5/16
11:38:58`)

test('match recognizes a Saman message', () => {
  expect(saman.match.test(SMS)).toBe(true)
})

test('match rejects an unrelated message', () => {
  expect(saman.match.test(normalize('کد ورود شما 12345'))).toBe(false)
})

test('amount captures the digits', () => {
  expect(SMS.match(saman.fields.amount)?.[1]).toBe('9926000')
})

test('direction rules identify a withdrawal', () => {
  const rule = saman.fields.direction.find((r) => r.re.test(SMS))
  expect(rule?.value).toBe('debit')
})

test('direction rules identify a deposit', () => {
  const deposit = normalize('بانك سامان\nواریز مبلغ 500,000 حقوق')
  const rule = saman.fields.direction.find((r) => r.re.test(deposit))
  expect(rule?.value).toBe('credit')
})

test('account captures the full account number', () => {
  expect(SMS.match(saman.fields.account!)?.[1]).toBe('2137-888-4747354-1')
})

test('balance captures the digits', () => {
  expect(SMS.match(saman.fields.balance!)?.[1]).toBe('673036251')
})

test('date captures the Jalali components', () => {
  const m = SMS.match(saman.fields.date!)
  expect([m?.[1], m?.[2], m?.[3]]).toEqual(['1405', '5', '16'])
})

test('time captures the clock components', () => {
  const m = SMS.match(saman.fields.time!)
  expect([m?.[1], m?.[2], m?.[3]]).toEqual(['11', '38', '58'])
})

test('description captures the purpose', () => {
  expect(SMS.match(saman.fields.description!)?.[1]).toBe('انتقال وجه')
})
