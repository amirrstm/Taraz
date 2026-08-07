'use server'

import { revalidatePath } from 'next/cache'
import {
  clearCategory,
  deleteTransaction,
  getCategoryById,
  getTransactionById,
  insertManual,
  setCategory,
  updateTransaction,
} from '@/lib/db/queries'
import { ingestSms, type IngestResult } from '@/lib/ingest'
import type { Direction } from '@/lib/sms/types'

/**
 * Every mutating action returns this instead of throwing on bad input.
 * These are POST-reachable behind only the session cookie, so callers must
 * validate at the boundary rather than trusting the client.
 */
export type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * A positive integer rial amount, rejecting zero, negative, float,
 * non-finite, and unsafe-integer values (>= 2^53, which the libsql driver
 * cannot represent and throws a RangeError on read).
 */
function isValidAmount(amount: number): boolean {
  return Number.isSafeInteger(amount) && amount > 0
}

const DIRECTIONS: Direction[] = ['debit', 'credit']

function isValidDirection(direction: string): direction is Direction {
  return (DIRECTIONS as string[]).includes(direction)
}

/** Belt-and-braces cap: this is free-text, not a bounded enum. */
const MAX_NOTE_LENGTH = 500

function isValidId(id: number): boolean {
  return Number.isFinite(id)
}

function revalidateAll(): void {
  revalidatePath('/inbox')
  revalidatePath('/month')
  // The dynamic segment template, so every category drill-down page is
  // covered, not just the one the mutation happened to originate from.
  revalidatePath('/month/category/[id]', 'page')
}

export async function categorizeAction(txId: number, categoryId: number): Promise<ActionResult> {
  if (!isValidId(txId) || !isValidId(categoryId)) {
    return { ok: false, error: 'Invalid id.' }
  }
  if (!(await getTransactionById(txId))) return { ok: false, error: 'Transaction not found.' }
  if (!(await getCategoryById(categoryId))) return { ok: false, error: 'Category not found.' }

  await setCategory(txId, categoryId)
  revalidateAll()
  return { ok: true }
}

export async function uncategorizeAction(txId: number): Promise<ActionResult> {
  if (!isValidId(txId)) return { ok: false, error: 'Invalid id.' }
  if (!(await getTransactionById(txId))) return { ok: false, error: 'Transaction not found.' }

  await clearCategory(txId)
  revalidateAll()
  return { ok: true }
}

export async function deleteAction(txId: number): Promise<ActionResult> {
  if (!isValidId(txId)) return { ok: false, error: 'Invalid id.' }
  if (!(await getTransactionById(txId))) return { ok: false, error: 'Transaction not found.' }

  await deleteTransaction(txId)
  revalidateAll()
  return { ok: true }
}

export async function addManualAction(input: {
  amount: number
  direction: Direction
  categoryId: number | null
  note: string | null
}): Promise<ActionResult> {
  if (!isValidAmount(input.amount)) {
    return { ok: false, error: 'Amount must be a positive integer.' }
  }
  if (!isValidDirection(input.direction)) {
    return { ok: false, error: 'Direction must be debit or credit.' }
  }
  if (input.note !== null && input.note.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: 'Note is too long.' }
  }
  if (input.categoryId !== null && !(await getCategoryById(input.categoryId))) {
    return { ok: false, error: 'Category not found.' }
  }

  await insertManual({ ...input, occurredAt: Date.now() })
  revalidateAll()
  return { ok: true }
}

export async function editAction(
  txId: number,
  patch: { amount?: number; direction?: Direction; categoryId?: number | null; note?: string | null },
): Promise<ActionResult> {
  if (!isValidId(txId)) return { ok: false, error: 'Invalid id.' }
  if (
    patch.amount === undefined &&
    patch.direction === undefined &&
    patch.categoryId === undefined &&
    patch.note === undefined
  ) {
    return { ok: false, error: 'No changes given.' }
  }
  if (!(await getTransactionById(txId))) return { ok: false, error: 'Transaction not found.' }
  if (patch.amount !== undefined && !isValidAmount(patch.amount)) {
    return { ok: false, error: 'Amount must be a positive integer.' }
  }
  if (patch.direction !== undefined && !isValidDirection(patch.direction)) {
    return { ok: false, error: 'Direction must be debit or credit.' }
  }
  if (patch.note !== undefined && patch.note !== null && patch.note.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: 'Note is too long.' }
  }
  if (
    patch.categoryId !== undefined &&
    patch.categoryId !== null &&
    !(await getCategoryById(patch.categoryId))
  ) {
    return { ok: false, error: 'Category not found.' }
  }

  await updateTransaction(txId, patch)
  revalidateAll()
  return { ok: true }
}

export async function pasteSmsAction(text: string): Promise<IngestResult> {
  const status = await ingestSms(text, 'paste', Date.now())
  revalidateAll()
  return status
}
