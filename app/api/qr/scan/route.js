import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { qrRateLimit } from '@/lib/redis/client'
import { parseQRPayload, isCurfewViolation } from '@/lib/qr/generator'
import { sendQRAlertEmail } from '@/lib/email'

export async function POST(req) {
  // ✅ Auth: only signed-in owners can trigger scans
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()

  // Verify caller is an owner
  const { data: caller } = await supabase
    .from('users').select('id,role').eq('clerk_id', userId).maybeSingle()
  if (!caller || caller.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 })
  }

  const { qrRaw, propertyId } = await req.json()
  if (!qrRaw || !propertyId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  // Parse QR payload
  const { valid, token } = parseQRPayload(qrRaw)
  if (!valid || !token) {
    return NextResponse.json({ error: 'Invalid QR code — not a RentEase QR' }, { status: 400 })
  }

  // Verify the property belongs to this owner
  const { data: property } = await supabase
    .from('properties').select('id,name,owner_id').eq('id', propertyId).maybeSingle()
  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }
  if (property.owner_id !== caller.id) {
    return NextResponse.json({ error: 'You do not own this property' }, { status: 403 })
  }

  // Rate limit: 1 scan per 30s per token (prevents double-tap)
  const { success: notThrottled } = await qrRateLimit.limit(token)
  if (!notThrottled) {
    return NextResponse.json({ error: 'QR scanned too recently. Wait 30 seconds.' }, { status: 429 })
  }

  // Look up student by QR token
  const { data: student } = await supabase
    .from('users')
    .select('id,full_name,email,role')
    .eq('qr_token', token)
    .eq('role', 'student')
    .maybeSingle()
  if (!student) {
    return NextResponse.json({ error: 'Student not found — QR may be outdated' }, { status: 404 })
  }

  // Verify student has an active enrollment at this property
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', student.id)
    .eq('property_id', propertyId)
    .eq('status', 'active')
    .maybeSingle()
  if (!enrollment) {
    return NextResponse.json({
      error: `${student.full_name} has no active enrollment at ${property.name}`
    }, { status: 403 })
  }

  // Determine scan type: toggle from last log
  const { data: lastLog } = await supabase
    .from('inout_logs')
    .select('scan_type')
    .eq('student_id', student.id)
    .eq('property_id', propertyId)
    .order('scanned_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const scanType = lastLog?.scan_type === 'in' ? 'out' : 'in'
  const curfewViolation = isCurfewViolation(scanType)

  // Insert log
  const { data: log, error: logError } = await supabase
    .from('inout_logs')
    .insert({
      student_id:          student.id,
      property_id:         propertyId,
      scan_type:           scanType,
      is_curfew_violation: curfewViolation,
      scanned_at:          new Date().toISOString(),
    })
    .select()
    .single()

  if (logError) {
    console.error('[POST /api/qr/scan]', logError)
    return NextResponse.json({ error: logError.message }, { status: 500 })
  }

  // Send email alert (non-blocking)
  sendQRAlertEmail(student, { ...log, is_curfew_violation: curfewViolation }).catch(console.error)

  return NextResponse.json({
    success:              true,
    scan_type:            scanType,
    student_name:         student.full_name,
    is_curfew_violation:  curfewViolation,
    timestamp:            log.scanned_at,
    message:              `${student.full_name} checked ${scanType.toUpperCase()}${curfewViolation ? ' ⚠️ Curfew violation!' : ''}`,
  })
}