'use server'

import { revalidatePath } from 'next/cache'
import {
  clearCategory,
  deleteTransaction,
  insertManual,
  setCategory,
  updateTransaction,
} from '@/lib/db/queries'
import type { Direction } from '@/lib/sms/types'

export async function categorizeAction(txId: number, categoryId: number): Promise<void> {
  await setCategory(txId, categoryId)
  revalidatePath('/inbox')
  revalidatePath('/month')
}

export async function uncategorizeAction(txId: number): Promise<void> {
  await clearCategory(txId)
  revalidatePath('/inbox')
  revalidatePath('/month')
}

export async function deleteAction(txId: number): Promise<void> {
  await deleteTransaction(txId)
  revalidatePath('/inbox')
  revalidatePath('/month')
}

export async function addManualAction(input: {
  amount: number
  direction: Direction
  categoryId: number | null
  note: string | null
}): Promise<void> {
  await insertManual({ ...input, occurredAt: Date.now() })
  revalidatePath('/inbox')
  revalidatePath('/month')
}

export async function editAction(
  txId: number,
  patch: { amount?: number; direction?: Direction; categoryId?: number | null; note?: string | null },
): Promise<void> {
  await updateTransaction(txId, patch)
  revalidatePath('/inbox')
  revalidatePath('/month')
}
