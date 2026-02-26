import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { apiRateLimit, getCachedUserRole, cacheUserRole, cacheDel } from '@/lib/redis/client'

// POST /api/enrollments — Student requests to book a room
export async function POST(req) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { success } = await apiRateLimit.limit(`enroll:${userId}`)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = getSupabaseAdmin()

  let role = await getCachedUserRole(userId)
  const { data: student } = await supabase
    .from('users')
    .select('id,role,full_name,email')
    .eq('clerk_id', userId)
    .maybeSingle()           // ← maybeSingle: won't crash if missing
  if (!student) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (!role) {
    role = student.role
    await cacheUserRole(userId, role)
  }

  if (role !== 'student') return NextResponse.json({ error: 'Only students can request enrollment' }, { status: 403 })

  const { propertyId, roomId, message } = await req.json()
  if (!propertyId || !roomId) return NextResponse.json({ error: 'propertyId and roomId are required' }, { status: 400 })

  // Check student doesn't already have an active/pending enrollment
  // maybeSingle: returns null safely when no row found (single() throws 406)
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id,status')
    .eq('student_id', student.id)
    .in('status', ['active', 'pending', 'approved'])
    .maybeSingle()

  if (existing) {
    const msg = existing.status === 'active'
      ? 'You already have an active enrollment'
      : 'You already have a pending booking request'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Verify room is still available
  const { data: room } = await supabase
    .from('rooms')
    .select('id,status,room_number,property_id')
    .eq('id', roomId)
    .eq('property_id', propertyId)
    .maybeSingle()

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.status !== 'available') return NextResponse.json({ error: 'Room is no longer available' }, { status: 400 })

  // Get property — use users!owner_id to disambiguate FK join
  const { data: property } = await supabase
    .from('properties')
    .select('id,name,current_price,owner_id,users!owner_id(full_name,email)')
    .eq('id', propertyId)
    .maybeSingle()

  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  // Create enrollment in 'pending' state
  const { data: enrollment, error } = await supabase
    .from('enrollments')
    .insert({
      student_id: student.id,
      property_id: propertyId,
      room_id: roomId,
      monthly_rent: property.current_price,
      status: 'pending',
      message: message || null,
      requested_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/enrollments]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await cacheDel(`property:${propertyId}`)
  return NextResponse.json(enrollment, { status: 201 })
}

// GET /api/enrollments — Student or Owner fetches enrollments
export async function GET(req) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()

  let role = await getCachedUserRole(userId)
  const { data: user } = await supabase
    .from('users')
    .select('id,role')
    .eq('clerk_id', userId)
    .maybeSingle()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (!role) {
    role = user.role
    await cacheUserRole(userId, role)
  }

  if (role === 'student') {
    const { data } = await supabase
      .from('enrollments')
      .select('*,properties(name,city,images),rooms(room_number,room_type)')
      .eq('student_id', user.id)
      .order('requested_at', { ascending: false })
    return NextResponse.json(data || [])
  }

  if (role === 'owner') {
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', user.id)
    const propIds = properties?.map(p => p.id) || []
    if (!propIds.length) return NextResponse.json([])

    const status = new URL(req.url).searchParams.get('status') || 'pending'

    const { data } = await supabase
      .from('enrollments')
      .select('*,users(full_name,email,phone),properties(name,city),rooms(room_number,room_type)')
      .in('property_id', propIds)
      .eq('status', status)
      .order('requested_at', { ascending: false })

    return NextResponse.json(data || [])
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}