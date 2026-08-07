import { createClient } from '@libsql/client'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import * as schema from '@/lib/db/schema'

let cached: LibSQLDatabase<typeof schema> | null = null

/**
 * Returns the Drizzle instance, creating it once per process.
 *
 * A `file:` URL is used locally and in tests; a `libsql://` URL with an auth
 * token is used on Vercel. The rest of the codebase cannot tell them apart.
 */
export function getDb(): LibSQLDatabase<typeof schema> {
  if (cached) return cached

  const url = process.env.TURSO_DATABASE_URL ?? 'file:./data/taraz.db'
  if (url.startsWith('file:')) {
    // Only meaningful locally; Vercel never takes this branch.
    mkdirSync(dirname(url.slice('file:'.length)), { recursive: true })
  }

  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  })
  cached = drizzle(client, { schema })
  return cached
}

/** Test-only. Forces the next getDb() to rebuild against a changed env. */
export function resetDbForTests(): void {
  cached = null
}
