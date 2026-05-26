import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  const hasAuth =
    request.cookies.has('access_token') ||
    request.cookies.has('refresh_token')

  if (!isPublic && !hasAuth) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isPublic && hasAuth) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
}
