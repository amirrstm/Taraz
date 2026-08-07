import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_NAME, verifySession } from '@/lib/auth/cookie'

// Exact paths that never require a session.
const EXEMPT_EXACT = new Set(['/login', '/api/login', '/api/sms', '/manifest.webmanifest', '/favicon.ico'])

// Directory prefixes (must end at a `/` boundary) that never require a session.
const EXEMPT_PREFIXES = ['/api/login/', '/api/sms/', '/_next/static/', '/_next/image/', '/icons/']

export function isExemptPath(pathname: string): boolean {
  if (EXEMPT_EXACT.has(pathname)) return true
  return EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (isExemptPath(pathname)) return NextResponse.next()

  const secret = process.env.COOKIE_SECRET
  if (!secret) return NextResponse.redirect(new URL('/login', req.url))

  let ok = false
  try {
    ok = await verifySession(req.cookies.get(COOKIE_NAME)?.value, secret, Date.now())
  } catch {
    // Any unexpected Web Crypto rejection must never grant access.
    ok = false
  }
  if (ok) return NextResponse.next()
  return NextResponse.redirect(new URL('/login', req.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
