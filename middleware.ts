import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_NAME, verifySession } from '@/lib/auth/cookie'

export async function middleware(req: NextRequest) {
  const secret = process.env.COOKIE_SECRET ?? ''
  const ok = await verifySession(req.cookies.get(COOKIE_NAME)?.value, secret, Date.now())
  if (ok) return NextResponse.next()
  return NextResponse.redirect(new URL('/login', req.url))
}

export const config = {
  matcher: ['/((?!api/sms|api/login|login|_next/static|_next/image|icons|manifest.webmanifest|favicon.ico).*)'],
}
