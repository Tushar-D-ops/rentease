import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { sendDisputeEmail } from '@/lib/email'

export async function GET(req) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase.from('users').select('id,role').eq('clerk_id', userId).single()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  let query = supabase.from('disputes').select('*,properties(name)').order('created_at', { ascending: false })
  if (user.role === 'student') query = query.eq('raised_by', user.id)
  else if (user.role === 'owner') {
    const { data: props } = await supabase.from('properties').select('id').eq('owner_id', user.id)
    query = query.in('property_id', props?.map((p)=>p.id)||[])
  }
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase.from('users').select('id,full_name,email').eq('clerk_id', userId).single()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  const { title, description, propertyId, invoiceId, evidenceUrls } = await req.json()
  const { data: dispute, error } = await supabase.from('disputes').insert({ raised_by:user.id, property_id:propertyId, invoice_id:invoiceId, title, description, evidence_urls:evidenceUrls||[], status:'open' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (propertyId) {
    const { data: property } = await supabase.from('properties').select('owner_id,users(full_name,email)').eq('id', propertyId).single()
    if (property?.users) sendDisputeEmail(property.users, dispute, true).catch(console.error)
  }
  return NextResponse.json(dispute, { status: 201 })
}