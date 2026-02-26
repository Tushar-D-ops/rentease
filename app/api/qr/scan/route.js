import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { qrRateLimit } from '@/lib/redis/client'
import { parseQRPayload, isCurfewViolation } from '@/lib/qr/generator'
import { sendQRAlertEmail } from '@/lib/email'

export async function POST(req) {
  const { qrRaw, propertyId } = await req.json()
  if (!qrRaw || !propertyId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  const { valid, token } = parseQRPayload(qrRaw)
  if (!valid || !token) return NextResponse.json({ error: 'Invalid QR code' }, { status: 400 })
  const { success: notThrottled } = await qrRateLimit.limit(token)
  if (!notThrottled) return NextResponse.json({ error: 'QR scanned too recently. Wait 30 seconds.' }, { status: 429 })
  const supabase = getSupabaseAdmin()
  const { data: student } = await supabase.from('users').select('id,full_name,email,role').eq('qr_token', token).eq('role','student').single()
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  const { data: enrollment } = await supabase.from('enrollments').select('id').eq('student_id',student.id).eq('property_id',propertyId).eq('status','active').single()
  if (!enrollment) return NextResponse.json({ error: 'No active enrollment at this property' }, { status: 403 })
  const { data: lastLog } = await supabase.from('inout_logs').select('scan_type').eq('student_id',student.id).eq('property_id',propertyId).order('scanned_at',{ascending:false}).limit(1).single()
  const scanType = lastLog?.scan_type === 'in' ? 'out' : 'in'
  const curfewViolation = isCurfewViolation(scanType)
  const { data: log } = await supabase.from('inout_logs').insert({ student_id:student.id, property_id:propertyId, scan_type:scanType, is_curfew_violation:curfewViolation, scanned_at:new Date().toISOString() }).select().single()
  sendQRAlertEmail(student, { ...log, is_curfew_violation:curfewViolation }).catch(console.error)
  return NextResponse.json({ success:true, scan_type:scanType, student_name:student.full_name, is_curfew_violation:curfewViolation, timestamp:log.scanned_at, message:`${student.full_name} checked ${scanType.toUpperCase()}${curfewViolation?' ⚠️ Curfew violation!':''}` })
}