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

export function InboxList({ items, categories }: { items: Item[]; categories: Category[] }) {
  const [selected, setSelected] = useState<Item | null>(null)

  if (items.length === 0) {
    return <p className="px-1 py-16 text-center text-neutral-500">Nothing to categorize.</p>
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {items.map((t) => (
          <TransactionCard
            key={t.id}
            amount={t.amount}
            direction={t.direction}
            status={t.status}
            description={t.description}
            occurredAt={t.occurredAt}
            onClick={() => setSelected(t)}
          />
        ))}
      </div>
      <CategorySheet
        tx={selected}
        categories={categories}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  )
}
