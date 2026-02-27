import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'
import { geocodeAddress } from '@/lib/maps/distance'

export async function POST(req) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role, college, phone } = await req.json()
  if (!role || !['student', 'owner'].includes(role))
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const clerkUser = await (await clerkClient()).users.getUser(userId)
  const email = clerkUser.emailAddresses[0]?.emailAddress
  const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim()

  const { data: existing } = await supabase
    .from('users').select('id').eq('clerk_id', userId).maybeSingle()
  if (existing) return NextResponse.json({ message: 'Already onboarded' })

  // ✅ Geocode college name → lat/lng for proximity filtering
  let college_lat = null
  let college_lng = null

  if (role === 'student' && college) {
    try {
      const coords = await geocodeAddress(college + ', India')
      college_lat = coords.lat
      college_lng = coords.lng
      console.log(`[Onboarding] Geocoded "${college}" → ${college_lat}, ${college_lng}`)
    } catch (err) {
      // Non-fatal — student can update later, just won't have proximity filter yet
      console.warn('[Onboarding] Could not geocode college:', err.message)
    }
  }

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      clerk_id: userId,
      email,
      full_name: fullName || email,
      phone: phone || null,
      role,
      college_name: college || null,
      college_lat,   // ✅ saved here
      college_lng,   // ✅ saved here
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })

  await (await clerkClient()).users.updateUserMetadata(userId, {
    publicMetadata: { role, supabase_id: newUser.id },
  })

  sendWelcomeEmail(newUser).catch(console.error)
  return NextResponse.json({ success: true, user: newUser })
}