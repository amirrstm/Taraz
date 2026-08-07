import type { BankTemplate } from '@/lib/sms/types'

export const saman: BankTemplate = {
  id: 'saman',
  match: /بانک سامان/,
  fields: {
    direction: [
      { re: /برداشت/, value: 'debit' },
      { re: /واریز/, value: 'credit' },
    ],
    amount: /مبلغ\s+(\d+)/,
    account: /از\s+([\d-]{6,})/,
    balance: /مانده\s+(\d+)/,
    date: /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
    time: /(\d{1,2}):(\d{2}):(\d{2})/,
    description: /(?:برداشت|واریز)\s+مبلغ\s+\d+\s+([^\n]+)/,
  },
}
