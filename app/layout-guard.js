// app/layout-guard.js
// Server component helper — runs in Node.js, has access to all env vars
// Import this in your (dashboard) layouts to enforce role-based access

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function requireRole(requiredRole) {
  const { userId } = await auth()

  if (!userId) redirect('/sign-in')

  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('clerk_id', userId)
    .maybeSingle()

  const role = user?.role

  // No role in DB → new user
  if (!role) redirect('/onboarding')

  // Wrong role → redirect to their dashboard
  if (role !== requiredRole) redirect(`/${role}`)

  return role
}