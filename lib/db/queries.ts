import { createHash } from 'node:crypto'
import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db/client'
import { categories, smsLog, transactions } from '@/lib/db/schema'
import type { Category, Transaction } from '@/lib/db/schema'
import { TEHRAN_OFFSET_MS } from '@/lib/sms/jalali'
import type { Direction, ParsedSms } from '@/lib/sms/types'

const DEDUPE_WINDOW_MS = 5 * 60 * 1000

/** Stable fingerprint of a raw SMS body, used for duplicate suppression. */
export function hashBody(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export async function isDuplicate(bodyHash: string, now: number): Promise<boolean> {
  const rows = await getDb()
    .select({ id: smsLog.id })
    .from(smsLog)
    .where(and(eq(smsLog.bodyHash, bodyHash), gte(smsLog.receivedAt, now - DEDUPE_WINDOW_MS)))
    .limit(1)
  return rows.length > 0
}

export async function logSms(input: {
  rawText: string
  bodyHash: string
  sender: string | null
  receivedAt: number
  parseOk: boolean
  error?: string | null
}): Promise<number> {
  const [row] = await getDb()
    .insert(smsLog)
    .values({ ...input, error: input.error ?? null })
    .returning({ id: smsLog.id })
  return row.id
}

export async function insertParsed(
  parsed: ParsedSms,
  smsLogId: number,
  receivedAt: number,
): Promise<number> {
  const [row] = await getDb()
    .insert(transactions)
    .values({
      amount: parsed.amount,
      direction: parsed.direction,
      accountTail: parsed.accountTail,
      balanceAfter: parsed.balanceAfter,
      occurredAt: parsed.occurredAt ?? receivedAt,
      status: 'uncategorized',
      source: 'sms',
      description: parsed.description,
      smsLogId,
      createdAt: receivedAt,
    })
    .returning({ id: transactions.id })
  return row.id
}

export async function insertNeedsReview(smsLogId: number, receivedAt: number): Promise<number> {
  const [row] = await getDb()
    .insert(transactions)
    .values({
      amount: 0,
      direction: 'debit',
      occurredAt: receivedAt,
      status: 'needs_review',
      source: 'sms',
      smsLogId,
      createdAt: receivedAt,
    })
    .returning({ id: transactions.id })
  return row.id
}

/** Everything awaiting user action: needs_review first, then newest uncategorized. */
export async function listInbox(): Promise<(Transaction & { categoryName: string | null })[]> {
  return (await getDb()
    .select({
      id: transactions.id,
      amount: transactions.amount,
      direction: transactions.direction,
      accountTail: transactions.accountTail,
      balanceAfter: transactions.balanceAfter,
      occurredAt: transactions.occurredAt,
      categoryId: transactions.categoryId,
      status: transactions.status,
      source: transactions.source,
      description: transactions.description,
      note: transactions.note,
      smsLogId: transactions.smsLogId,
      createdAt: transactions.createdAt,
      categoryName: categories.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(inArray(transactions.status, ['uncategorized', 'needs_review']))
    .orderBy(sql`case ${transactions.status} when 'needs_review' then 0 else 1 end`,
      desc(transactions.occurredAt))) as (Transaction & { categoryName: string | null })[]
}

export async function listCategories(): Promise<Category[]> {
  return getDb().select().from(categories).orderBy(categories.sortOrder)
}

/** Existence check for server-action input validation. */
export async function getCategoryById(categoryId: number): Promise<Category | undefined> {
  const rows = await getDb().select().from(categories).where(eq(categories.id, categoryId)).limit(1)
  return rows[0]
}

/** Existence check for server-action input validation. */
export async function getTransactionById(txId: number): Promise<Transaction | undefined> {
  const rows = await getDb().select().from(transactions).where(eq(transactions.id, txId)).limit(1)
  return rows[0]
}

export async function setCategory(txId: number, categoryId: number): Promise<void> {
  await getDb()
    .update(transactions)
    .set({ categoryId, status: 'categorized' })
    .where(eq(transactions.id, txId))
}

export async function clearCategory(txId: number): Promise<void> {
  await getDb()
    .update(transactions)
    .set({ categoryId: null, status: 'uncategorized' })
    .where(eq(transactions.id, txId))
}

export async function insertManual(input: {
  amount: number
  direction: Direction
  categoryId: number | null
  note: string | null
  occurredAt: number
}): Promise<number> {
  const [row] = await getDb()
    .insert(transactions)
    .values({
      amount: input.amount,
      direction: input.direction,
      occurredAt: input.occurredAt,
      categoryId: input.categoryId,
      status: input.categoryId === null ? 'uncategorized' : 'categorized',
      source: 'manual',
      note: input.note,
      createdAt: input.occurredAt,
    })
    .returning({ id: transactions.id })
  return row.id
}

export async function updateTransaction(
  txId: number,
  patch: {
    amount?: number
    direction?: Direction
    categoryId?: number | null
    note?: string | null
    occurredAt?: number
  },
): Promise<void> {
  const set: Record<string, unknown> = { ...patch }
  if (patch.categoryId !== undefined) {
    set.status = patch.categoryId === null ? 'uncategorized' : 'categorized'
  }
  await getDb().update(transactions).set(set).where(eq(transactions.id, txId))
}

export async function deleteTransaction(txId: number): Promise<void> {
  await getDb().delete(transactions).where(eq(transactions.id, txId))
}

/** Spending only. Credits are excluded from totals and the per-category list. */
export async function monthSummary(
  startMs: number,
  endMs: number,
): Promise<{
  total: number
  byCategory: { categoryId: number | null; name: string; icon: string; total: number }[]
  daily: { day: number; total: number }[]
}> {
  const db = getDb()
  const inRange = and(
    gte(transactions.occurredAt, startMs),
    lt(transactions.occurredAt, endMs),
    eq(transactions.direction, 'debit'),
    eq(transactions.status, 'categorized'),
  )

  const byCategory = (await db
    .select({
      categoryId: transactions.categoryId,
      name: categories.name,
      icon: categories.icon,
      total: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(inRange)
    .groupBy(transactions.categoryId)
    .orderBy(sql`sum(${transactions.amount}) desc`))
    .map((r) => ({
      categoryId: r.categoryId,
      name: r.name ?? 'Uncategorized',
      icon: r.icon ?? '📦',
      total: Number(r.total ?? 0),
    }))

  // Shift by the fixed Tehran offset before extracting the day so the
  // bucket reflects Iran-local wall-clock time, not UTC.
  const tehranDay = sql`strftime('%d', (${transactions.occurredAt} + ${TEHRAN_OFFSET_MS}) / 1000, 'unixepoch')`

  const daily = (await db
    .select({
      day: sql<number>`cast(${tehranDay} as integer)`,
      total: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .where(inRange)
    .groupBy(tehranDay))
    .map((r) => ({ day: Number(r.day), total: Number(r.total ?? 0) }))

  return {
    total: byCategory.reduce((sum, c) => sum + c.total, 0),
    byCategory,
    daily,
  }
}

export async function listByCategory(
  startMs: number,
  endMs: number,
  categoryId: number,
): Promise<Transaction[]> {
  return getDb()
    .select()
    .from(transactions)
    .where(
      and(
        gte(transactions.occurredAt, startMs),
        lt(transactions.occurredAt, endMs),
        eq(transactions.categoryId, categoryId),
      ),
    )
    .orderBy(desc(transactions.occurredAt))
}
