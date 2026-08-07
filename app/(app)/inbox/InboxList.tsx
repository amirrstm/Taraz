'use client'

import { useRef, useState } from 'react'
import { uncategorizeAction } from '@/app/(app)/actions'
import { CategorySheet } from '@/components/CategorySheet'
import { TransactionCard } from '@/components/TransactionCard'
import { UndoToast } from '@/components/UndoToast'
import type { Category } from '@/lib/db/schema'

type Item = {
  id: number
  amount: number
  direction: string
  status: string
  description: string | null
  occurredAt: number
}

type Toast = { id: number; txId: number; categoryName: string }

export function InboxList({ items, categories }: { items: Item[]; categories: Category[] }) {
  const [selected, setSelected] = useState<Item | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const nextToastId = useRef(0)

  function handleCategorized(txId: number, categoryName: string) {
    nextToastId.current += 1
    setToast({ id: nextToastId.current, txId, categoryName })
  }

  function handleUndo(txId: number) {
    void uncategorizeAction(txId)
  }

  return (
    <>
      {items.length === 0 ? (
        <p className="px-1 py-16 text-center text-neutral-500">Nothing to categorize.</p>
      ) : (
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
      )}
      <CategorySheet
        tx={selected}
        categories={categories}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        onCategorized={handleCategorized}
      />
      {toast && (
        <UndoToast
          key={toast.id}
          message={`Categorized as ${toast.categoryName}`}
          onUndo={() => handleUndo(toast.txId)}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  )
}
