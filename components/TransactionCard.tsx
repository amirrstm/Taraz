'use client'

import { formatToman } from '@/lib/money'

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
  const time = new Date(occurredAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
