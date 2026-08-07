'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addManualAction } from '@/app/(app)/actions'
import type { Category } from '@/lib/db/schema'
import { parseTomanInput } from '@/lib/money'
import type { Direction } from '@/lib/sms/types'

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
    <div className="flex flex-col gap-4">
      <input
        inputMode="numeric"
        value={toman}
        onChange={(e) => setToman(e.target.value)}
        placeholder="Amount in toman"
        className="rounded-xl bg-neutral-900 px-4 py-4 text-2xl outline-none ring-1 ring-neutral-800 focus:ring-neutral-600"
      />

      <div className="flex gap-2">
        {(['debit', 'credit'] as Direction[]).map((d) => (
          <button
            key={d}
            onClick={() => setDirection(d)}
            className={`flex-1 rounded-xl py-3 ${
              direction === d ? 'bg-neutral-100 text-neutral-900' : 'bg-neutral-900 text-neutral-400'
            }`}
          >
            {d === 'debit' ? 'Spent' : 'Received'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
            className={`flex h-20 flex-col items-center justify-center gap-1 rounded-xl ${
              categoryId === c.id ? 'bg-neutral-100 text-neutral-900' : 'bg-neutral-900'
            }`}
          >
            <span className="text-xl">{c.icon}</span>
            <span className="text-xs">{c.name}</span>
          </button>
        ))}
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="rounded-xl bg-neutral-900 px-4 py-4 outline-none ring-1 ring-neutral-800 focus:ring-neutral-600"
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={submit}
        disabled={pending}
        className="rounded-xl bg-neutral-100 py-4 text-lg font-medium text-neutral-900 disabled:opacity-50"
      >
        Save
      </button>
    </div>
  )
}
