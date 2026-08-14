'use client'

import { useEffect, useState, useTransition } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Category } from '@/lib/db/schema'
import { parseTomanInput } from '@/lib/money'
import { MAX_NOTE_LENGTH } from '@/lib/transaction'
import { categorizeAction, deleteAction, editAction } from '@/app/(app)/actions'

type Tx = { id: number; amount: number; status: string; note: string | null }

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
  const [note, setNote] = useState('')

  const needsAmount = tx !== null && tx.amount === 0

  useEffect(() => {
    setToman(tx && tx.amount > 0 ? String(Math.round(tx.amount / 10)) : '')
    setNote(tx?.note ?? '')
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
        // Only the fields that actually changed are sent: editAction rejects an
        // empty patch, so an untouched amount and note must not be included.
        const nextNote = note.trim() || null
        const patch: { amount?: number; note?: string | null } = {}
        if (rial !== tx.amount) patch.amount = rial
        if (nextNote !== tx.note) patch.note = nextNote

        if (patch.amount !== undefined || patch.note !== undefined) {
          const editResult = await editAction(tx.id, patch)
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
    setError(null)
    start(async () => {
      // Matches pick(): without the catch a thrown action (a dropped
      // connection, say) rejects inside the transition and the button appears
      // to do nothing at all.
      try {
        const result = await deleteAction(tx.id)
        if (!result.ok) {
          setError(result.error)
          return
        }
        onOpenChange(false)
      } catch {
        setError('Could not delete. Try again.')
      }
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* DrawerContent renders the portal, the overlay and the grab handle, but
          not the bottom safe-area padding — without it the delete button lands
          under the iPhone home indicator. */}
      <DrawerContent className="bg-card pb-[env(safe-area-inset-bottom)]">
        <DrawerHeader className="shrink-0 gap-1 pb-0 text-left">
          <DrawerTitle className="text-base">
            {needsAmount ? 'Enter the amount' : 'Edit transaction'}
          </DrawerTitle>
          {/* Both variants name picking a category as the action that saves —
              with an editable note as well as an amount, it is no longer
              obvious which control commits the change. */}
          <DrawerDescription>
            {needsAmount
              ? 'Enter the amount, then pick a category to save'
              : 'Edit the amount or note, then pick a category to save'}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex shrink-0 flex-col gap-2 px-4 pt-3">
          <Label htmlFor="sheet-amount" className="sr-only">
            Amount in toman
          </Label>
          <Input
            id="sheet-amount"
            inputMode="numeric"
            autoFocus={needsAmount}
            value={toman}
            onChange={(e) => setToman(e.target.value)}
            placeholder="Amount in toman"
            className="h-auto rounded-xl bg-secondary px-4 py-3 text-xl md:text-xl"
          />
          <Label htmlFor="sheet-note" className="sr-only">
            Note
          </Label>
          <Input
            id="sheet-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            maxLength={MAX_NOTE_LENGTH}
            className="h-auto rounded-xl bg-secondary px-4 py-3 md:text-base"
          />
        </div>
        {/* The only scrolling region: the drawer is capped at 80vh and the
            category grid is taller than that, so it scrolls while the amount
            field and the delete button stay put. `min-h-0` is required for a
            flex child to be allowed to shrink below its content height. */}
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-3 overflow-y-auto overscroll-contain p-4">
          {categories.map((c) => (
            <Button
              key={c.id}
              variant="secondary"
              disabled={pending}
              onClick={() => pick(c.id)}
              // `whitespace-normal` because the primitive sets nowrap, which
              // would clip the longer category names.
              className="h-24 flex-col gap-2 whitespace-normal rounded-xl"
            >
              <span className="text-2xl" aria-hidden>
                {c.icon}
              </span>
              <span className="text-xs text-muted-foreground">{c.name}</span>
            </Button>
          ))}
        </div>
        {error && (
          <Alert variant="destructive" className="mx-4 mb-2 w-auto shrink-0">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DrawerFooter className="shrink-0 pt-0">
          <Button
            variant="ghost"
            onClick={remove}
            disabled={pending}
            className="h-auto w-full py-4 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Delete transaction
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
