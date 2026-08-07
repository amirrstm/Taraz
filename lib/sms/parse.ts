import { normalize } from '@/lib/sms/normalize'
import { jalaliToUnixMs } from '@/lib/sms/jalali'
import { TEMPLATES } from '@/lib/sms/templates'
import type { BankTemplate, ParsedSms } from '@/lib/sms/types'

/**
 * Used when no template matches. Deliberately loose: it only needs an amount
 * and a direction word to produce a usable transaction.
 */
const GENERIC: BankTemplate = {
  id: 'generic',
  match: /.*/,
  fields: {
    direction: [
      { re: /برداشت|خرید|پرداخت|کسر/, value: 'debit' },
      { re: /واریز|دریافت|افزایش/, value: 'credit' },
    ],
    amount: /مبلغ\s+(\d+)/,
    account: /از\s+([\d-]{6,})/,
    balance: /مانده\s+(\d+)/,
    date: /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
    time: /(\d{1,2}):(\d{2}):(\d{2})/,
    description: /(?:برداشت|واریز|خرید|پرداخت)\s+مبلغ\s+\d+\s+([^\n]+)/,
  },
}

function digits(text: string, re: RegExp | undefined): number | null {
  if (!re) return null
  const m = text.match(re)
  if (!m?.[1]) return null
  const n = Number(m[1])
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

function occurredAt(text: string, template: BankTemplate): number | null {
  const d = template.fields.date ? text.match(template.fields.date) : null
  if (!d) return null
  const t = template.fields.time ? text.match(template.fields.time) : null
  return jalaliToUnixMs(
    Number(d[1]),
    Number(d[2]),
    Number(d[3]),
    t ? Number(t[1]) : 0,
    t ? Number(t[2]) : 0,
    t ? Number(t[3]) : 0,
  )
}

function extract(text: string, template: BankTemplate, bankId: string | null): ParsedSms | null {
  const amount = digits(text, template.fields.amount)
  if (amount === null) return null

  const rule = template.fields.direction.find((r) => r.re.test(text))
  if (!rule) return null

  const accountMatch = template.fields.account ? text.match(template.fields.account) : null
  const account = accountMatch?.[1] ?? null
  const descriptionMatch = template.fields.description
    ? text.match(template.fields.description)
    : null

  return {
    bankId,
    amount,
    direction: rule.value,
    accountTail: account ? (account.split('-').pop() ?? null) : null,
    balanceAfter: digits(text, template.fields.balance),
    occurredAt: occurredAt(text, template),
    description: descriptionMatch?.[1]?.trim() || null,
  }
}

/**
 * Turns a raw SMS body into a transaction, or null when the message is not a
 * recognizable transaction notification. Never throws.
 */
export function parse(raw: string): ParsedSms | null {
  try {
    const text = normalize(raw)
    if (!text) return null

    for (const template of TEMPLATES) {
      if (template.match.test(text)) {
        const result = extract(text, template, template.id)
        if (result) return result
      }
    }

    return extract(text, GENERIC, null)
  } catch {
    return null
  }
}
