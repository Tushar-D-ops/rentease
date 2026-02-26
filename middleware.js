import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Middleware ONLY handles: is user signed in?
// Role-based redirects are handled in layout.js files (server components = Node.js runtime)
// This avoids the Edge runtime limitation where SUPABASE_SERVICE_ROLE_KEY is unavailable

const PUBLIC_ROUTES = ['/', '/sign-in', '/sign-up', '/onboarding', '/api/']

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl

  // Always allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  const { userId } = await auth()

  // Not signed in → redirect to sign-in
  if (!userId) {
    const url = req.nextUrl.clone()
    url.pathname = '/sign-in'
    return NextResponse.redirect(url)
  }

  // Signed in → let through, layout.js handles role checks
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'],
}