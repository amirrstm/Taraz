import { normalize } from '@/lib/sms/normalize'

/**
 * Markers that positively identify a bank SMS as *not* a transaction.
 *
 * These are distinct from a message that merely fails to parse: an unparsed
 * message might still be money moving and belongs in the Inbox for review,
 * whereas these are known to be noise and are dropped. Each pattern is
 * justified by a real message; do not add speculative ones, since a false
 * positive here silently discards a real transaction.
 */
const NON_TRANSACTION: RegExp[] = [
  // One-time purchase password. Arrives alongside the real purchase SMS and
  // carries the same amount, so parsing it would double-count the spend.
  //   بانک سامان / خرید / کانون سردفتران / مبلغ 473,000 ریال / رمز 685736
  /(^|\s)رمز(\s|$)/,
  // Validity window of the password above.
  //   زمان اعتبار رمز 13:32:20
  /زمان اعتبار/,
  // Login notification for the online banking portal.
  //   بانک سامان / ورود به درگاه بانکی / 1405/5/18 / 14:09:56
  /ورود به درگاه/,
  // Login verification code.
  //   کد ورود شما 12345 است
  /کد\s*ورود/,
]

/**
 * True when the message is a known non-transaction bank notification (a
 * one-time password, a login alert) that should be dropped rather than shown
 * for review. Never throws.
 */
export function isNonTransaction(raw: string): boolean {
  try {
    const text = normalize(raw)
    return NON_TRANSACTION.some((re) => re.test(text))
  } catch {
    // A message we cannot even normalize is not one we can confidently
    // discard — let it through to the parser and the Inbox.
    return false
  }
}
