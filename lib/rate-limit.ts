export const LIMIT = 60
const WINDOW_MS = 60_000

const buckets = new Map<string, { count: number; resetAt: number }>()

/**
 * Fixed-window counter held in process memory.
 *
 * On Vercel this is per-instance, not global, so the effective limit is higher
 * than 60/min under concurrency. That is acceptable: this exists to blunt an
 * accidental Shortcut loop, not to stop an attacker — the API key does that.
 */
export function allow(key: string, now: number): boolean {
  const bucket = buckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (bucket.count >= LIMIT) return false
  bucket.count++
  return true
}
