import type { BankTemplate } from '@/lib/sms/types'

export const saman: BankTemplate = {
  id: 'saman',
  // Requires the transaction shape, not just the bank name: Saman sends
  // one-time passwords and login alerts under the same name, and those must
  // not be treated as money moving.
  match: /بانک سامان[\s\S]*(?:برداشت|واریز)\s+مبلغ\s+\d/,
  fields: {
    direction: [
      { re: /برداشت/, value: 'debit' },
      { re: /واریز/, value: 'credit' },
    ],
    // The direction word must be adjacent to the amount. A bare `مبلغ 473,000`
    // also appears in purchase-password messages, which are not transactions.
    amount: /(?:برداشت|واریز)\s+مبلغ\s+(\d+)/,
    account: /از\s+([\d-]{6,})/,
    balance: /مانده\s+(\d+)/,
    date: /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
    time: /(\d{1,2}):(\d{2}):(\d{2})/,
    description: /(?:برداشت|واریز)\s+مبلغ\s+\d+\s+([^\n]+)/,
  },
}
