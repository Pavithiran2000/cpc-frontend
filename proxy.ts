import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_PUBLIC = [
  '/platform/login',
  '/platform/forgot-password',
  '/platform/reset-password',
]

const TENANT_PUBLIC = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPlatformRoute = pathname.startsWith('/platform')
  const isPlatformPublic = PLATFORM_PUBLIC.some((p) => pathname.startsWith(p))
  const isTenantPublic = TENANT_PUBLIC.some((p) => pathname.startsWith(p))

  const hasPlatformAuth =
    request.cookies.has('platform_access_token') ||
    request.cookies.has('platform_refresh_token')

  const hasTenantAuth =
    request.cookies.has('access_token') ||
    request.cookies.has('refresh_token')

  if (isPlatformRoute) {
    if (!isPlatformPublic && !hasPlatformAuth) {
      const loginUrl = new URL('/platform/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
    if (isPlatformPublic && hasPlatformAuth) {
      return NextResponse.redirect(new URL('/platform/dashboard', request.url))
    }
    return NextResponse.next()
  }

  if (!isTenantPublic && !hasTenantAuth) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }
  if (isTenantPublic && hasTenantAuth) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
}
