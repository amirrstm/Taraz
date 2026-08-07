import { existsSync, rmSync } from 'node:fs'
import { afterAll, beforeAll, expect, test } from 'vitest'

const TEST_DB = './data/test-schema.db'

beforeAll(() => {
  process.env.TURSO_DATABASE_URL = `file:${TEST_DB}`
  process.env.TURSO_AUTH_TOKEN = ''
  rmSync(TEST_DB, { force: true })
})

afterAll(() => {
  for (const suffix of ['', '-wal', '-shm']) rmSync(`${TEST_DB}${suffix}`, { force: true })
})

test('migrations create the tables and seed categories', async () => {
  const { migrate } = await import('drizzle-orm/libsql/migrator')
  const { getDb } = await import('@/lib/db/client')
  const { seedCategories } = await import('@/lib/db/seed')
  const { categories } = await import('@/lib/db/schema')

  const db = getDb()
  await migrate(db, { migrationsFolder: './drizzle' })
  await seedCategories(db)
  await seedCategories(db) // idempotent

  const rows = await db.select().from(categories)
  expect(rows).toHaveLength(10)
  expect(rows.map((r) => r.name)).toContain('Groceries')
  expect(existsSync(TEST_DB)).toBe(true)
})
