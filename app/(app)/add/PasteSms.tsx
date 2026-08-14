'use client'

import { useState, useTransition } from 'react'
import { pasteSmsAction } from '@/app/(app)/actions'
import type { IngestResult } from '@/lib/ingest'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const MESSAGES: Record<IngestResult, string> = {
  parsed: 'Saved. Check the Inbox to categorize it.',
  needs_review: "Couldn't read the amount — added to the Inbox for review.",
  duplicate: 'Already recorded.',
  ignored: 'Not a transaction message — nothing to record.',
}

export function PasteSms() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<IngestResult | null>(null)
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
    // The form only exists so the Import button submits; Enter inside the
    // textarea must still insert a newline, since bank messages are multi-line.
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex flex-col gap-3"
    >
      <Label htmlFor="sms" className="sr-only">
        Bank message text
      </Label>
      <Textarea
        id="sms"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="Paste the bank message here"
        // Bank SMS is Persian; without this it renders LTR-jumbled while typing.
        dir="auto"
        className="rounded-xl bg-card px-4 py-3 md:text-base"
      />
      {result && (
        <Alert>
          <AlertDescription>{MESSAGES[result]}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        type="submit"
        variant="secondary"
        disabled={pending || !text.trim()}
        className="h-auto rounded-xl py-3 font-medium"
      >
        Import
      </Button>
    </form>
  )
}
