import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { allow } from '@/lib/rate-limit'
import { ingestSms } from '@/lib/ingest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function keyMatches(provided: string, expected: string): boolean {
  // Hash both sides to a fixed 32-byte digest before comparing, so the
  // comparison time never varies with the length of either input — a
  // length check before timingSafeEqual would leak the configured key's
  // length via timing.
  const a = createHash('sha256').update(provided).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

export async function POST(req: Request): Promise<Response> {
  const expected = process.env.SMS_API_KEY
  if (!expected) return NextResponse.json({ ok: false }, { status: 500 })

  const provided = req.headers.get('x-api-key') ?? ''
  if (!keyMatches(provided, expected)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const now = Date.now()
  if (!allow(ip, now)) {
    return NextResponse.json({ ok: false, status: 'rate_limited' }, { status: 429 })
  }

  let body: { text?: unknown; sender?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, status: 'bad_json' }, { status: 400 })
  }

  const text = typeof body.text === 'string' ? body.text : ''
  if (!text.trim()) {
    return NextResponse.json({ ok: false, status: 'missing_text' }, { status: 400 })
  }
  const sender = typeof body.sender === 'string' ? body.sender : null

  const status = await ingestSms(text, sender, now)
  return NextResponse.json({ ok: true, status })
}
