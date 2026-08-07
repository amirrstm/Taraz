import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  icon: text('icon').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const smsLog = sqliteTable(
  'sms_log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    rawText: text('raw_text').notNull(),
    bodyHash: text('body_hash').notNull(),
    sender: text('sender'),
    receivedAt: integer('received_at').notNull(),
    parseOk: integer('parse_ok', { mode: 'boolean' }).notNull(),
    error: text('error'),
  },
  (t) => [index('sms_log_hash_time').on(t.bodyHash, t.receivedAt)],
)

export const transactions = sqliteTable(
  'transactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Positive integer rial. */
    amount: integer('amount').notNull(),
    /** 'debit' | 'credit' */
    direction: text('direction').notNull(),
    accountTail: text('account_tail'),
    balanceAfter: integer('balance_after'),
    /** Unix ms, UTC. */
    occurredAt: integer('occurred_at').notNull(),
    categoryId: integer('category_id').references(() => categories.id),
    /** 'uncategorized' | 'categorized' | 'needs_review' */
    status: text('status').notNull().default('uncategorized'),
    /** 'sms' | 'manual' */
    source: text('source').notNull().default('sms'),
    description: text('description'),
    note: text('note'),
    smsLogId: integer('sms_log_id').references(() => smsLog.id),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('tx_status').on(t.status),
    index('tx_occurred_at').on(t.occurredAt),
    index('tx_category').on(t.categoryId),
  ],
)

export type Transaction = typeof transactions.$inferSelect
export type Category = typeof categories.$inferSelect
