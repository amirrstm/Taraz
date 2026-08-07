'use client'

import { useEffect, useState, useTransition } from 'react'
import { Drawer } from 'vaul'
import type { Category } from '@/lib/db/schema'
import { parseTomanInput } from '@/lib/money'
import { categorizeAction, deleteAction, editAction } from '@/app/(app)/actions'

type Tx = { id: number; amount: number; status: string }

export function CategorySheet({
  tx,
  categories,
  open,
  onOpenChange,
  onCategorized,
}: {
  tx: Tx | null
  categories: Category[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onCategorized?: (txId: number, categoryName: string) => void
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [toman, setToman] = useState('')

  const needsAmount = tx !== null && tx.amount === 0

  useEffect(() => {
    setToman(tx && tx.amount > 0 ? String(Math.round(tx.amount / 10)) : '')
    setError(null)
  }, [tx])

  function pick(categoryId: number) {
    if (!tx) return

    // The field is always shown, prefilled with the current amount, so a
    // miscategorized row's amount can be corrected here too — not just
    // filled in for a needs_review row that has none yet.
    const rial = parseTomanInput(toman)
    if (rial === null) {
      setError('Enter the amount in toman first.')
      return
    }

    setError(null)
    start(async () => {
      try {
        if (rial !== tx.amount) {
          const editResult = await editAction(tx.id, { amount: rial })
          if (!editResult.ok) {
            setError(editResult.error)
            return
          }
        }
        const categorizeResult = await categorizeAction(tx.id, categoryId)
        if (!categorizeResult.ok) {
          setError(categorizeResult.error)
          return
        }
        const categoryName = categories.find((c) => c.id === categoryId)?.name ?? 'category'
        onCategorized?.(tx.id, categoryName)
        onOpenChange(false)
      } catch {
        setError('Could not save. Try again.')
      }
    })
  }

  function remove() {
    if (!tx) return
    start(async () => {
      const result = await deleteAction(tx.id)
      if (!result.ok) {
        setError(result.error)
        return
      }
      onOpenChange(false)
    })
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-neutral-900 pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-neutral-700" />
          <Drawer.Title className="px-5 pt-4 text-sm text-neutral-400">
            {needsAmount ? 'Enter the amount, then pick a category' : 'Edit amount or pick a category'}
          </Drawer.Title>
          <input
            inputMode="numeric"
            autoFocus={needsAmount}
            value={toman}
            onChange={(e) => setToman(e.target.value)}
            placeholder="Amount in toman"
            className="mx-4 mt-3 rounded-xl bg-neutral-800 px-4 py-3 text-xl outline-none"
          />
          <div className="grid grid-cols-3 gap-3 p-4">
            {categories.map((c) => (
              <button
                key={c.id}
                disabled={pending}
                onClick={() => pick(c.id)}
                className="flex h-24 flex-col items-center justify-center gap-2 rounded-xl bg-neutral-800 active:bg-neutral-700 disabled:opacity-50"
              >
                <span className="text-2xl">{c.icon}</span>
                <span className="text-xs text-neutral-300">{c.name}</span>
              </button>
            ))}
          </div>
          {error && <p className="px-5 pb-2 text-sm text-red-400">{error}</p>}
          <button
            onClick={remove}
            disabled={pending}
            className="w-full py-4 text-sm text-red-400 disabled:opacity-50"
          >
            Delete transaction
          </button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
