import { normalize } from '@/lib/sms/normalize'

/**
 * Persian transaction purposes as they appear in Iranian bank SMS, mapped to
 * the English the UI is written in.
 *
 * Ordered longest-first: the entries are matched by substring, so "خرید
 * اینترنتی" must be tested before the "خرید" it contains, or every online
 * purchase would read as a plain one.
 */
const PURPOSES: [fa: string, en: string][] = [
  ['انتقال وجه پایا', 'Paya transfer'],
  ['انتقال وجه ساتنا', 'Satna transfer'],
  ['خرید اینترنتی', 'Online purchase'],
  ['پرداخت قبض', 'Bill payment'],
  ['کارت به کارت', 'Card to card'],
  ['انتقال وجه', 'Transfer'],
  ['انتقال به', 'Transfer'],
  ['وجه نقد', 'Cash'],
  ['خرید', 'Purchase'],
  ['برداشت', 'Withdrawal'],
  ['واریز', 'Deposit'],
  ['پرداخت', 'Payment'],
  ['کارمزد', 'Fee'],
  ['قبض', 'Bill'],
  ['شارژ', 'Top-up'],
  ['سود', 'Interest'],
  ['وام', 'Loan'],
  ['پایا', 'Paya transfer'],
  ['ساتنا', 'Satna transfer'],
]

/** True if the string contains any Arabic-block (Persian) character. */
function hasPersian(text: string): boolean {
  // U+0600–U+06FF, written as escapes so the range survives any re-encoding.
  return /[؀-ۿ]/.test(text)
}

/**
 * Renders a parsed SMS description in English for display.
 *
 * Returns null — rather than the original Persian — when nothing matches, so
 * the UI never shows Persian text it cannot translate; callers already fall
 * back to the transaction time. Nothing is lost either way: the raw SMS is
 * kept verbatim in `sms_log`.
 *
 * Descriptions that are already Latin (a merchant name, say) pass through
 * unchanged. Never throws.
 */
export function describe(description: string | null): string | null {
  if (!description) return null

  const text = normalize(description).trim()
  if (text === '') return null

  for (const [fa, en] of PURPOSES) {
    if (text.includes(fa)) return en
  }

  return hasPersian(text) ? null : text
}
