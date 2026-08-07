import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { parse } from '@/lib/sms/parse'
import { allow } from '@/lib/rate-limit'
import {
  hashBody,
  insertNeedsReview,
  insertParsed,
  isDuplicate,
  logSms,
} from '@/lib/db/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function keyMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
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

  const bodyHash = hashBody(text)
  if (await isDuplicate(bodyHash, now)) {
    return NextResponse.json({ ok: true, status: 'duplicate' })
  }

  const parsed = parse(text)
  const logId = await logSms({
    rawText: text,
    bodyHash,
    sender,
    receivedAt: now,
    parseOk: parsed !== null,
    error: parsed === null ? 'unparsed' : null,
  })

  if (parsed) {
    await insertParsed(parsed, logId, now)
    return NextResponse.json({ ok: true, status: 'parsed' })
  }

  await insertNeedsReview(logId, now)
  return NextResponse.json({ ok: true, status: 'needs_review' })
}
