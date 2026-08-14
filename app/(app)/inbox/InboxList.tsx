'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { uncategorizeAction } from '@/app/(app)/actions'
import { CategorySheet } from '@/components/CategorySheet'
import { TransactionCard } from '@/components/TransactionCard'
import type { Category } from '@/lib/db/schema'

type Item = {
  id: number
  amount: number
  direction: string
  status: string
  description: string | null
  note: string | null
  occurredAt: number
}

export function InboxList({ items, categories }: { items: Item[]; categories: Category[] }) {
  const [selected, setSelected] = useState<Item | null>(null)

  function handleCategorized(txId: number, categoryName: string) {
    toast(`Categorized as ${categoryName}`, {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          void uncategorizeAction(txId).then((result) => {
            // Undo failing silently would leave the row categorized with no
            // sign anything went wrong.
            if (!result.ok) toast.error(result.error)
          })
        },
      },
    })
  }

  return (
    <>
      {items.length === 0 ? (
        <p className="px-1 py-16 text-center text-muted-foreground">Nothing to categorize.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((t) => (
            <TransactionCard
              key={t.id}
              amount={t.amount}
              direction={t.direction}
              status={t.status}
              description={t.description}
              note={t.note}
              occurredAt={t.occurredAt}
              onClick={() => setSelected(t)}
            />
          ))}
        </div>
      )}
      <CategorySheet
        tx={selected}
        categories={categories}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        onCategorized={handleCategorized}
      />
    </>
  )
}
