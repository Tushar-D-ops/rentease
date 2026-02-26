import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getCachedUserRole, cacheUserRole, cacheDel } from '@/lib/redis/client'
import { generateQRToken } from '@/lib/qr/generator'

// PATCH /api/enrollments/[id] — Owner approves or rejects
export async function PATCH(req, { params }) {
  const { id } = params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()

  let role = await getCachedUserRole(userId)
  const { data: owner } = await supabase.from('users').select('id,role').eq('clerk_id', userId).single()
  if (!owner) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (!role) {
    role = owner.role
    await cacheUserRole(userId, role)
  }

  if (role !== 'owner') return NextResponse.json({ error: 'Owner access required' }, { status: 403 })

  const { action } = await req.json() // 'approve' | 'reject'
  if (!['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  // Get enrollment and verify it belongs to owner's property
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('*,users(id,full_name,email,qr_token),properties(id,name,owner_id),rooms(id,room_number)')
    .eq('id', id)
    .single()

  if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
  if (enrollment.properties?.owner_id !== owner.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (enrollment.status !== 'pending') return NextResponse.json({ error: 'Enrollment is no longer pending' }, { status: 400 })

  if (action === 'reject') {
    await supabase.from('enrollments').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', id)
    return NextResponse.json({ success: true, status: 'rejected' })
  }

  // APPROVE: mark room as filled, set enrollment active, generate QR if needed
  const studentUser = enrollment.users

  // Generate QR token for student if they don't have one
  let qrToken = studentUser.qr_token
  if (!qrToken) {
    qrToken = generateQRToken(studentUser.id)
    await supabase.from('users').update({ qr_token: qrToken }).eq('id', studentUser.id)
  }

  // Mark room filled
  await supabase.from('rooms').update({ status: 'filled' }).eq('id', enrollment.room_id)

  // Activate enrollment
  const { data: updated, error } = await supabase
    .from('enrollments')
    .update({
      status: 'active',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Invalidate property cache
  await cacheDel(`property:${enrollment.property_id}`)

  return NextResponse.json({ success: true, status: 'active', enrollment: updated })
}