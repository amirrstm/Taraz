'use client'

import { useState, useTransition } from 'react'
import { pasteSmsAction } from '@/app/(app)/actions'

const MESSAGES = {
  parsed: 'Saved. Check the Inbox to categorize it.',
  needs_review: "Couldn't read the amount — added to the Inbox for review.",
  duplicate: 'Already recorded.',
} as const

export function PasteSms() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<keyof typeof MESSAGES | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    if (!text.trim()) return
    setError(null)
    setResult(null)
    start(async () => {
      try {
        setResult(await pasteSmsAction(text))
        setText('')
      } catch {
        setError('Could not save. Try again.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="Paste the bank message here"
        className="rounded-xl bg-neutral-900 px-4 py-3 outline-none ring-1 ring-neutral-800 focus:ring-neutral-600"
      />
      {result && <p className="text-sm text-neutral-400">{MESSAGES[result]}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        onClick={submit}
        disabled={pending || !text.trim()}
        className="rounded-xl bg-neutral-800 py-3 font-medium disabled:opacity-50"
      >
        Import
      </button>
    </div>
  )
}
