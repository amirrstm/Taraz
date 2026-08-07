export type Direction = 'debit' | 'credit'

/** A transaction successfully extracted from an SMS. */
export interface ParsedSms {
  /** Template id that matched, or null when the generic fallback was used. */
  bankId: string | null
  /** Positive integer rial. */
  amount: number
  direction: Direction
  /** Last segment of the account number, e.g. "1" from "2137-888-4747354-1". */
  accountTail: string | null
  /** Positive integer rial, or null when the SMS carried no balance. */
  balanceAfter: number | null
  /** Unix ms, or null when the SMS carried no usable date. */
  occurredAt: number | null
  /** Free-text purpose, e.g. "انتقال وجه". */
  description: string | null
}

export interface DirectionRule {
  re: RegExp
  value: Direction
}

/**
 * A bank's SMS format expressed as data. Every regex runs against normalized
 * text, so it may assume ASCII digits and Persian letter forms.
 */
export interface BankTemplate {
  id: string
  /** Identifies the bank. */
  match: RegExp
  fields: {
    direction: DirectionRule[]
    /** Capture group 1: digits. */
    amount: RegExp
    /** Capture group 1: the full account number. */
    account?: RegExp
    /** Capture group 1: digits. */
    balance?: RegExp
    /** Capture groups 1-3: Jalali year, month, day. */
    date?: RegExp
    /** Capture groups 1-3: hours, minutes, seconds. */
    time?: RegExp
    /** Capture group 1: description text. */
    description?: RegExp
  }
}
