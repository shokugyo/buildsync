import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
}

function isIpInCidr(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) return ip === cidr
  const [range, bits] = cidr.split('/')
  const mask = bits === '0' ? 0 : (~0 << (32 - parseInt(bits, 10))) >>> 0
  try {
    return (ipToNumber(ip) & mask) === (ipToNumber(range) & mask)
  } catch {
    return false
  }
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.ip ?? '127.0.0.1'
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always allow Next.js internals, static assets, auth endpoints, and the login page itself
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Redirect unauthenticated requests for page routes to login
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  const companyId = token.companyId as string | undefined
  if (!companyId) return NextResponse.next()

  // Enforce IP restrictions for all authenticated routes
  try {
    const baseUrl = req.nextUrl.origin
    const res = await fetch(`${baseUrl}/api/settings/ip-restrictions`, {
      headers: {
        cookie: req.headers.get('cookie') ?? '',
      },
    })

    if (!res.ok) return NextResponse.next()

    const restrictions: { cidr: string; enabled: boolean }[] = await res.json()
    const enabledCidrs = restrictions.filter((r) => r.enabled).map((r) => r.cidr)

    if (enabledCidrs.length === 0) return NextResponse.next()

    const clientIp = getClientIp(req)
    const allowed = enabledCidrs.some((cidr) => isIpInCidr(clientIp, cidr))

    if (!allowed) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'このIPアドレスからのアクセスは許可されていません' },
          { status: 403 }
        )
      }
      // For page routes return a plain 403 page
      return new NextResponse('このIPアドレスからのアクセスは許可されていません', {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }
  } catch {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  // Match all routes except Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
