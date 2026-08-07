import { migrate } from 'drizzle-orm/libsql/migrator'
import { getDb } from '@/lib/db/client'
import { seedCategories } from '@/lib/db/seed'

/**
 * Applies pending migrations and seeds categories.
 *
 * Run by hand after a schema change — never at request time. Vercel functions
 * are concurrent and short-lived; migrating from one would race with itself.
 */
export async function runMigrations(): Promise<void> {
  const db = getDb()
  await migrate(db, { migrationsFolder: './drizzle' })
  await seedCategories(db)
}

await runMigrations()
console.log('migrations applied')
