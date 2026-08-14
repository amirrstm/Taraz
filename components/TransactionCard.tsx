'use client'

import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatToman } from '@/lib/money'
import { describe } from '@/lib/sms/describe'
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
  note,
  occurredAt,
  onClick,
}: {
  amount: number
  direction: string
  status: string
  /** The bank's own purpose, parsed from the SMS. */
  description: string | null
  /** The user's own words, which win over the bank's when both exist. */
  note: string | null
  occurredAt: number
  onClick: () => void
}) {
  const time = formatTehran(occurredAt)
  const review = status === 'needs_review'
  // The parser stores the bank's Persian purpose verbatim; the UI is English,
  // so it is translated here rather than at ingest time — the stored SMS stays
  // exactly as received.
  const label = note?.trim() || describe(description)

  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className="h-auto w-full justify-between rounded-xl bg-card px-4 py-4 text-left hover:bg-accent active:bg-accent"
    >
      <span className="min-w-0">
        <span className="block text-lg font-semibold">
          {review ? 'Unparsed SMS' : `${direction === 'credit' ? '+' : ''}${formatToman(amount)} T`}
        </span>
        {/* `dir="auto"` because a note is free text and may well be Persian,
            which would otherwise render bidi-jumbled and truncate on the wrong
            side. */}
        <span dir="auto" className="block truncate text-sm text-muted-foreground">
          {label ?? time}
        </span>
      </span>
      <ChevronRight className="ml-3 size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Button>
  )
}
