export const COOKIE_NAME = 'taraz_session'
export const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000

async function hmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Produces `v1.<expiresAt>.<hmac>`. */
export async function signSession(expiresAt: number, secret: string): Promise<string> {
  const payload = `v1.${expiresAt}`
  return `${payload}.${await hmac(payload, secret)}`
}

export async function verifySession(
  value: string | undefined,
  secret: string,
  now: number,
): Promise<boolean> {
  if (!value || !secret) return false
  const parts = value.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') return false

  const expiresAt = Number(parts[1])
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return false

  let expected: string
  try {
    expected = await hmac(`v1.${parts[1]}`, secret)
  } catch {
    // A malformed secret or an unexpected Web Crypto rejection must never
    // grant access — treat it the same as a signature mismatch.
    return false
  }
  if (expected.length !== parts[2].length) return false

  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ parts[2].charCodeAt(i)
  }
  return diff === 0
}
