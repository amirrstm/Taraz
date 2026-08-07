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

function revalidateAll(): void {
  revalidatePath('/inbox')
  revalidatePath('/month')
}

export async function categorizeAction(txId: number, categoryId: number): Promise<ActionResult> {
  if (!(await getTransactionById(txId))) return { ok: false, error: 'Transaction not found.' }
  if (!(await getCategoryById(categoryId))) return { ok: false, error: 'Category not found.' }

  await setCategory(txId, categoryId)
  revalidateAll()
  return { ok: true }
}

export async function uncategorizeAction(txId: number): Promise<ActionResult> {
  if (!(await getTransactionById(txId))) return { ok: false, error: 'Transaction not found.' }

  await clearCategory(txId)
  revalidateAll()
  return { ok: true }
}

export async function deleteAction(txId: number): Promise<ActionResult> {
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
  if (!(await getTransactionById(txId))) return { ok: false, error: 'Transaction not found.' }
  if (patch.amount !== undefined && !isValidAmount(patch.amount)) {
    return { ok: false, error: 'Amount must be a positive integer.' }
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
