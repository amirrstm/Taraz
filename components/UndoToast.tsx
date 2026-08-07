'use client'

import { useEffect } from 'react'

const DURATION_MS = 5000

/**
 * A single auto-dismissing toast with an Undo action.
 *
 * Callers must remount this component per toast (e.g. `key={toast.id}`) so a
 * new toast fully replaces the old one: mounting a fresh instance runs the
 * previous instance's cleanup first, which clears its timer before the new
 * one starts. The same cleanup fires on unmount (e.g. navigating away).
 */
export function UndoToast({
  message,
  onUndo,
  onDismiss,
}: {
  message: string
  onUndo: () => void
  onDismiss: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, DURATION_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-x-4 z-40 flex items-center justify-between gap-3 rounded-xl bg-neutral-800 px-4 py-3 text-sm shadow-lg shadow-black/40 bottom-[calc(6rem+env(safe-area-inset-bottom))]">
      <span className="text-neutral-100">{message}</span>
      <button
        onClick={() => {
          onUndo()
          onDismiss()
        }}
        className="shrink-0 font-semibold text-neutral-100 underline underline-offset-2"
      >
        Undo
      </button>
    </div>
  )
}
