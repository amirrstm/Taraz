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
  { name: 'Transfer', icon: '🔁', sortOrder: 8 },
  { name: 'Income', icon: '💰', sortOrder: 9 },
  { name: 'Other', icon: '📦', sortOrder: 10 },
]

/** Inserts the default categories. Safe to run repeatedly. */
export async function seedCategories(db: LibSQLDatabase<typeof schema>): Promise<void> {
  await db.insert(categories).values(SEED_CATEGORIES).onConflictDoNothing()
}
