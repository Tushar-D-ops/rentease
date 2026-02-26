import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const ROLE_ROUTES = {
  student: ['/student'],
  owner:   ['/owner'],
  admin:   ['/admin'],
}

const PUBLIC_ROUTES = ['/', '/sign-in', '/sign-up', '/onboarding', '/api/webhooks']

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl
  const { userId, sessionClaims } = await auth()

  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) return NextResponse.next()

  if (!userId) {
    const url = req.nextUrl.clone()
    url.pathname = '/sign-in'
    return NextResponse.redirect(url)
  }

  const userRole = sessionClaims?.publicMetadata?.role

  for (const [role, paths] of Object.entries(ROLE_ROUTES)) {
    if (paths.some((p) => pathname.startsWith(p))) {
      if (userRole !== role) {
        const url = req.nextUrl.clone()
        url.pathname = userRole ? `/${userRole}` : '/onboarding'
        return NextResponse.redirect(url)
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'],
}
