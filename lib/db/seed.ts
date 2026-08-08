import { sql } from 'drizzle-orm'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from '@/lib/db/schema'
import { categories } from '@/lib/db/schema'

export const SEED_CATEGORIES = [
  { name: 'Groceries', icon: '🛒', sortOrder: 1 },
  { name: 'Dining', icon: '🍽️', sortOrder: 2 },
  { name: 'Transport', icon: '🚗', sortOrder: 3 },
  { name: 'Bills', icon: '🧾', sortOrder: 4 },
  { name: 'Health', icon: '💊', sortOrder: 5 },
  { name: 'Shopping', icon: '🛍️', sortOrder: 6 },
  { name: 'Rent', icon: '🏠', sortOrder: 7 },
  { name: 'Utilities', icon: '🔌', sortOrder: 8 },
  { name: 'Internet & Mobile', icon: '📶', sortOrder: 9 },
  { name: 'Fuel', icon: '⛽', sortOrder: 10 },
  { name: 'Vehicle Repair', icon: '🔧', sortOrder: 11 },
  { name: 'Installments', icon: '🏦', sortOrder: 12 },
  { name: 'Subscriptions', icon: '💳', sortOrder: 13 },
  { name: 'Pets', icon: '🐾', sortOrder: 14 },
  { name: 'Personal', icon: '🚬', sortOrder: 15 },
  { name: 'Kiana', icon: '💗', sortOrder: 16 },
  { name: 'Transfer', icon: '🔁', sortOrder: 17 },
  { name: 'Income', icon: '💰', sortOrder: 18 },
  { name: 'Other', icon: '📦', sortOrder: 19 },
]

/**
 * Inserts the default categories. Safe to run repeatedly.
 *
 * The name is the identity, so re-running re-asserts icon and sort order on
 * rows that already exist. Without that, inserting a category in the middle of
 * the list would leave every older row holding its original sortOrder and the
 * two sets would interleave. Category ids — the only thing transactions
 * reference — are never touched.
 */
export async function seedCategories(db: LibSQLDatabase<typeof schema>): Promise<void> {
  await db
    .insert(categories)
    .values(SEED_CATEGORIES)
    .onConflictDoUpdate({
      target: categories.name,
      set: {
        icon: sql`excluded.icon`,
        sortOrder: sql`excluded.sort_order`,
      },
    })
}
