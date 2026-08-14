'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addManualAction } from '@/app/(app)/actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Category } from '@/lib/db/schema'
import { parseTomanInput } from '@/lib/money'
import type { Direction } from '@/lib/sms/types'
import { MAX_NOTE_LENGTH } from '@/lib/transaction'

const SELECTED = 'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'

export function AddForm({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [toman, setToman] = useState('')
  const [direction, setDirection] = useState<Direction>('debit')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit() {
    const rial = parseTomanInput(toman)
    if (rial === null) {
      setError('Enter an amount greater than zero.')
      return
    }
    setError(null)
    start(async () => {
      try {
        const result = await addManualAction({
          amount: rial,
          direction,
          categoryId,
          note: note.trim() || null,
        })
        if (!result.ok) {
          setError(result.error)
          return
        }
        router.push('/inbox')
      } catch {
        setError('Could not save. Try again.')
      }
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex flex-col gap-4"
    >
      <Label htmlFor="amount" className="sr-only">
        Amount in toman
      </Label>
      <Input
        id="amount"
        inputMode="numeric"
        value={toman}
        onChange={(e) => setToman(e.target.value)}
        placeholder="Amount in toman"
        className="h-auto rounded-xl bg-card px-4 py-4 text-2xl md:text-2xl"
      />

      <ToggleGroup
        type="single"
        aria-label="Direction"
        value={direction}
        // Radix emits '' when you tap the already-selected item. Direction must
        // always have a value, so that case is ignored — matching the pair of
        // plain buttons this replaced, which could not be deselected.
        onValueChange={(v) => v && setDirection(v as Direction)}
        className="w-full gap-2"
      >
        <ToggleGroupItem value="debit" className={`h-auto flex-1 rounded-xl py-3 ${SELECTED}`}>
          Spent
        </ToggleGroupItem>
        <ToggleGroupItem value="credit" className={`h-auto flex-1 rounded-xl py-3 ${SELECTED}`}>
          Received
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Here the deselect-to-'' behaviour is wanted: tapping the selected
          category again clears it back to null. */}
      <ToggleGroup
        type="single"
        aria-label="Category"
        value={categoryId === null ? '' : String(categoryId)}
        onValueChange={(v) => setCategoryId(v === '' ? null : Number(v))}
        // `!grid` because the primitive's own `flex` would otherwise win, and
        // `w-full` to displace its `w-fit`.
        className="!grid w-full grid-cols-3 gap-2"
      >
        {categories.map((c) => (
          <ToggleGroupItem
            key={c.id}
            value={String(c.id)}
            className={`h-20 flex-col gap-1 whitespace-normal rounded-xl bg-card ${SELECTED}`}
          >
            <span className="text-xl" aria-hidden>
              {c.icon}
            </span>
            <span className="text-xs">{c.name}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Label htmlFor="note" className="sr-only">
        Note (optional)
      </Label>
      <Input
        id="note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        maxLength={MAX_NOTE_LENGTH}
        className="h-auto rounded-xl bg-card px-4 py-4 md:text-base"
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="h-auto rounded-xl py-4 text-lg font-medium"
      >
        {pending ? 'Saving…' : 'Save'}
      </Button>
    </form>
  )
}
