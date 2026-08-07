import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { COOKIE_NAME, SESSION_TTL_MS, signSession } from '@/lib/auth/cookie'
import { allow } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function POST(req: Request): Promise<Response> {
  // Rate-limit before touching bcrypt: at cost 10 a flood of guesses can
  // still burn CPU even though each guess ultimately fails.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!allow(`login:${ip}`, Date.now())) {
    return NextResponse.json({ ok: false }, { status: 429 })
  }

  const hash = process.env.APP_PASSWORD_HASH
  const secret = process.env.COOKIE_SECRET
  if (!hash || !secret) return NextResponse.json({ ok: false }, { status: 500 })

  const form = await req.formData()
  const password = String(form.get('password') ?? '')

  if (!bcrypt.compareSync(password, hash)) {
    return NextResponse.redirect(new URL('/login?error=1', req.url), 303)
  }

  const expiresAt = Date.now() + SESSION_TTL_MS
  const jar = await cookies()
  jar.set(COOKIE_NAME, await signSession(expiresAt, secret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expiresAt),
  })

  return NextResponse.redirect(new URL('/inbox', req.url), 303)
}
