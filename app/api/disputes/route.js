import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { sendDisputeEmail } from '@/lib/email'

export async function GET(req) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()

  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', userId)
    .maybeSingle()  // ✅ was .single() — throws if no row

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  let query = supabase
    .from('disputes')
    .select('*, properties!property_id(name)')  // ✅ disambiguate FK
    .order('created_at', { ascending: false })

  if (user.role === 'student') {
    query = query.eq('raised_by', user.id)
  } else if (user.role === 'owner') {
    const { data: props } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', user.id)

    const propIds = props?.map(p => p.id) || []
    if (!propIds.length) return NextResponse.json([]) // ✅ no properties = no disputes
    query = query.in('property_id', propIds)
  } else if (user.role === 'admin') {
    // admin sees all — no filter
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await query
  if (error) {
    console.error('[GET /api/disputes]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

export async function POST(req) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()

  const { data: user } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('clerk_id', userId)
    .maybeSingle()  // ✅ was .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { title, description, propertyId, invoiceId, evidenceUrls } = await req.json()

  if (!title || !description) {
    return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
  }

  const { data: dispute, error } = await supabase
    .from('disputes')
    .insert({
      raised_by:     user.id,
      property_id:   propertyId || null,
      invoice_id:    invoiceId  || null,
      title,
      description,
      evidence_urls: evidenceUrls || [],
      status:        'open',
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/disputes]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notify owner if property attached
  if (propertyId) {
    const { data: property } = await supabase
      .from('properties')
      .select('owner_id, users!owner_id(full_name, email)')  // ✅ disambiguate FK
      .eq('id', propertyId)
      .maybeSingle()

    if (property?.users) {
      sendDisputeEmail(property.users, dispute, true).catch(console.error)
    }
  }

  return NextResponse.json(dispute, { status: 201 })
}