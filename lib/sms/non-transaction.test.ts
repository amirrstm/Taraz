import { expect, test } from 'vitest'
import { isNonTransaction } from '@/lib/sms/non-transaction'

const PURCHASE_OTP = `بانک سامان
خريد
کانون سردفتران
مبلغ 473,000 ريال
رمز 685736
زمان اعتبار رمز 13:32:20`

const PORTAL_LOGIN = `بانک سامان
ورود به درگاه بانکي
1405/5/18
14:09:56`

const REAL_WITHDRAWAL = `بانك سامان
برداشت مبلغ 473,000 خريدکالا
از ‪2137-888-4747354-1‬
مانده 653,007,251
1405/5/18
13:30:39`

test('flags a purchase one-time password', () => {
  expect(isNonTransaction(PURCHASE_OTP)).toBe(true)
})

test('flags a portal login notification', () => {
  expect(isNonTransaction(PORTAL_LOGIN)).toBe(true)
})

test('flags a login code message', () => {
  expect(isNonTransaction('کد ورود شما 12345 است')).toBe(true)
})

test('does not flag a real transaction', () => {
  expect(isNonTransaction(REAL_WITHDRAWAL)).toBe(false)
})

test('does not flag a transfer whose description is unrelated', () => {
  const transfer = `بانك سامان
برداشت مبلغ 5,800,000 انتقال وجه
از ‪2137-888-4747354-1‬
مانده 647,207,251
1405/5/18
14:10:53`
  expect(isNonTransaction(transfer)).toBe(false)
})

test('does not flag empty input', () => {
  expect(isNonTransaction('')).toBe(false)
})
