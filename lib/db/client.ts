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

  const configured = process.env.TURSO_DATABASE_URL?.trim()

  // In production the URL is mandatory. Without this guard a missing variable
  // silently selects the local `file:` path below, whose mkdirSync then fails
  // against Vercel's read-only filesystem — an EROFS several frames from the
  // actual mistake, surfaced to the user as an opaque error digest.
  if (process.env.NODE_ENV === 'production' && !configured) {
    throw new Error(
      'TURSO_DATABASE_URL is not set. Set it (and TURSO_AUTH_TOKEN) in the ' +
        'Vercel project environment variables, then redeploy — environment ' +
        'changes do not reach an existing deployment.',
    )
  }

  const url = configured || 'file:./data/taraz.db'
  if (url.startsWith('file:')) {
    // Only meaningful locally; Vercel never takes this branch.
    mkdirSync(dirname(url.slice('file:'.length)), { recursive: true })
  } else if (!process.env.TURSO_AUTH_TOKEN?.trim()) {
    throw new Error(
      `TURSO_AUTH_TOKEN is not set, but TURSO_DATABASE_URL (${url}) is remote. ` +
        'Remote libSQL databases reject unauthenticated connections.',
    )
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
