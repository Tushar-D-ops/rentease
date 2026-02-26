import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

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

  // Try session token first (fast), fall back to DB if missing
  let userRole = sessionClaims?.publicMetadata?.role

  if (!userRole) {
    // Session token may not have refreshed yet after onboarding — check DB
    try {
      const supabase = getSupabaseAdmin()
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('clerk_id', userId)
        .maybeSingle()
      userRole = user?.role
    } catch {
      // DB unreachable — let it pass through, page will handle it
    }
  }

  // No role in DB either → new user, send to onboarding
  if (!userRole) {
    const url = req.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  // Role-based route guard
  for (const [role, paths] of Object.entries(ROLE_ROUTES)) {
    if (paths.some((p) => pathname.startsWith(p))) {
      if (userRole !== role) {
        const url = req.nextUrl.clone()
        url.pathname = `/${userRole}`
        return NextResponse.redirect(url)
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'],
}