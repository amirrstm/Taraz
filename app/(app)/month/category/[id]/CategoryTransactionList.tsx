'use client'

import { TransactionCard } from '@/components/TransactionCard'

type Item = {
  id: number
  amount: number
  direction: string
  status: string
  description: string | null
  occurredAt: number
}

/** Read-only drill-down list: tapping a row here has no further action. */
export function CategoryTransactionList({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return <p className="px-1 py-16 text-center text-neutral-500">No transactions.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <TransactionCard
            amount={item.amount}
            direction={item.direction}
            status={item.status}
            description={item.description}
            occurredAt={item.occurredAt}
            onClick={() => {}}
          />
        </li>
      ))}
    </ul>
  )
}
