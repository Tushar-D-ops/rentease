import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function PATCH(req) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { college_name, college_lat, college_lng, phone, full_name } = await req.json()

  if (!college_lat || !college_lng) {
    return NextResponse.json({ error: 'college_lat and college_lng are required' }, { status: 400 })
  }

  const lat = parseFloat(college_lat)
  const lng = parseFloat(college_lng)

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const updates = {
    college_lat: lat,
    college_lng: lng,
    updated_at: new Date().toISOString(),
  }

  if (college_name?.trim()) updates.college_name = college_name.trim()
  if (phone !== undefined)   updates.phone = phone || null
  if (full_name?.trim())     updates.full_name = full_name.trim()

  const { data: updated, error } = await supabase
    .from('users')
    .update(updates)
    .eq('clerk_id', userId)
    .select('id, full_name, email, phone, college_name, college_lat, college_lng')
    .single()

  if (error) {
    console.error('[PATCH /api/users/update-college]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, user: updated })
}