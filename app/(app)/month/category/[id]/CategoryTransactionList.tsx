'use client'

import { useState } from 'react'
import { CategorySheet } from '@/components/CategorySheet'
import { TransactionCard } from '@/components/TransactionCard'
import type { Category } from '@/lib/db/schema'

type Item = {
  id: number
  amount: number
  direction: string
  status: string
  description: string | null
  occurredAt: number
}

/**
 * Drill-down list. Tapping a row reopens the same categorization sheet the
 * Inbox uses, so a mistake made there (wrong category, wrong amount) is
 * still correctable after the row has left the Inbox. See design spec §8:
 * "Editing reuses the categorization sheet."
 */
export function CategoryTransactionList({
  items,
  categories,
}: {
  items: Item[]
  categories: Category[]
}) {
  const [selected, setSelected] = useState<Item | null>(null)

  if (items.length === 0) {
    return <p className="px-1 py-16 text-center text-neutral-500">No transactions.</p>
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <TransactionCard
              amount={item.amount}
              direction={item.direction}
              status={item.status}
              description={item.description}
              occurredAt={item.occurredAt}
              onClick={() => setSelected(item)}
            />
          </li>
        ))}
      </ul>
      <CategorySheet
        tx={selected}
        categories={categories}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  )
}
