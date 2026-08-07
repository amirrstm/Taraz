'use client'

import { formatToman } from '@/lib/money'
import { TEHRAN_OFFSET_MS } from '@/lib/sms/jalali'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/**
 * Formats a unix-ms instant as Tehran-local wall-clock time without relying
 * on Intl or the system timezone database: shift by the fixed Tehran offset
 * and read the UTC fields, the same approach lib/db/queries.ts uses for the
 * daily breakdown. Using `toLocaleString` with no `timeZone` would read the
 * runtime's timezone database, which renders UTC during server-side
 * rendering and Tehran time on the phone — a hydration mismatch — and can
 * silently disagree with the Month screen's Iran-local bucketing.
 */
function formatTehran(occurredAt: number): string {
  const d = new Date(occurredAt + TEHRAN_OFFSET_MS)
  const month = MONTHS[d.getUTCMonth()]
  const day = d.getUTCDate()
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${month} ${day}, ${hh}:${mm}`
}

export function TransactionCard({
  amount,
  direction,
  status,
  description,
  occurredAt,
  onClick,
}: {
  amount: number
  direction: string
  status: string
  description: string | null
  occurredAt: number
  onClick: () => void
}) {
  const time = formatTehran(occurredAt)
  const review = status === 'needs_review'

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl bg-neutral-900 px-4 py-4 text-left active:bg-neutral-800"
    >
      <span className="min-w-0">
        <span className="block text-lg font-semibold">
          {review ? 'Unparsed SMS' : `${direction === 'credit' ? '+' : ''}${formatToman(amount)} T`}
        </span>
        <span className="block truncate text-sm text-neutral-400">
          {description ?? time}
        </span>
      </span>
      <span className="ml-3 shrink-0 text-neutral-600">›</span>
    </button>
  )
}
