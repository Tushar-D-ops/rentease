import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getCachedUserRole, cacheUserRole, cacheDel } from '@/lib/redis/client'
import { generateQRToken } from '@/lib/qr/generator'

export async function PATCH(req, context) {
  // ✅ Next.js 15: params must be awaited via context
  const { id } = await context.params

  console.log('[PATCH /api/enrollments] id:', id) // DEBUG — check server logs

  if (!id) return NextResponse.json({ error: 'Missing enrollment ID' }, { status: 400 })

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()

  let role = await getCachedUserRole(userId)
  const { data: owner, error: ownerErr } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', userId)
    .maybeSingle()

  console.log('[PATCH /api/enrollments] owner:', owner, 'ownerErr:', ownerErr) // DEBUG

  if (!owner) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (!role) {
    role = owner.role
    await cacheUserRole(userId, role)
  }

  if (role !== 'owner') return NextResponse.json({ error: 'Owner access required' }, { status: 403 })

  const body = await req.json()
  const { action } = body
  console.log('[PATCH /api/enrollments] action:', action) // DEBUG

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // ✅ Fetch enrollment WITHOUT any joins first — isolate the problem
  const { data: enrollment, error: enrollErr } = await supabase
    .from('enrollments')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  console.log('[PATCH /api/enrollments] enrollment:', enrollment, 'error:', enrollErr) // DEBUG

  if (enrollErr) return NextResponse.json({ error: enrollErr.message }, { status: 500 })
  if (!enrollment) return NextResponse.json({ error: `Enrollment not found for id: ${id}` }, { status: 404 })
  if (enrollment.status !== 'pending') {
    return NextResponse.json({ error: `Enrollment is no longer pending (status: ${enrollment.status})` }, { status: 400 })
  }

  // ✅ Verify ownership separately
  const { data: property } = await supabase
    .from('properties')
    .select('id, owner_id')
    .eq('id', enrollment.property_id)
    .maybeSingle()

  console.log('[PATCH /api/enrollments] property:', property) // DEBUG

  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  if (property.owner_id !== owner.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // REJECT
  if (action === 'reject') {
    const { error: rejectErr } = await supabase
      .from('enrollments')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (rejectErr) {
      console.error('[PATCH /api/enrollments] reject error:', rejectErr)
      return NextResponse.json({ error: rejectErr.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, status: 'rejected' })
  }

  // APPROVE
  // Fetch student separately to avoid FK ambiguity
  const { data: studentUser } = await supabase
    .from('users')
    .select('id, full_name, email, qr_token')
    .eq('id', enrollment.student_id)
    .maybeSingle()

  console.log('[PATCH /api/enrollments] studentUser:', studentUser) // DEBUG

  if (!studentUser) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  // Generate QR token if needed
  let qrToken = studentUser.qr_token
  if (!qrToken) {
    qrToken = generateQRToken(studentUser.id)
    await supabase.from('users').update({ qr_token: qrToken }).eq('id', studentUser.id)
  }

  // Mark room as filled
  const { error: roomErr } = await supabase
    .from('rooms')
    .update({ status: 'filled' })
    .eq('id', enrollment.room_id)

  if (roomErr) console.error('[PATCH /api/enrollments] room update error:', roomErr)

  // Activate enrollment
  const { data: updated, error: updateErr } = await supabase
    .from('enrollments')
    .update({
      status: 'active',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (updateErr) {
    console.error('[PATCH /api/enrollments] activate error:', updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  await cacheDel(`property:${enrollment.property_id}`)

  return NextResponse.json({ success: true, status: 'active', enrollment: updated })
}