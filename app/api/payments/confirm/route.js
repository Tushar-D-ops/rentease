import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { sendPaymentSuccessEmail } from '@/lib/email'

export async function POST(req) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()

  const { data: owner } = await supabase
    .from('users').select('id, role').eq('clerk_id', userId).maybeSingle()
  if (!owner || owner.role !== 'owner')
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 })

  const { invoiceId, action } = await req.json()
  // action: 'confirm' | 'reject'
  if (!invoiceId || !['confirm', 'reject'].includes(action))
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  // Fetch invoice and verify it belongs to owner's property
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, users!student_id(full_name, email), properties!property_id(owner_id, name)')
    .eq('id', invoiceId)
    .maybeSingle()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.properties?.owner_id !== owner.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (invoice.status !== 'under_review')
    return NextResponse.json({ error: 'Invoice is not under review' }, { status: 400 })

  if (action === 'reject') {
    // Send back to pending so student can re-submit
    await supabase.from('invoices').update({
      status:            'pending',
      payment_proof_url: null,
      upi_txn_id:        null,
    }).eq('id', invoiceId)

    return NextResponse.json({ success: true, status: 'pending' })
  }

  // CONFIRM — mark as paid
  const now = new Date().toISOString()

  await supabase.from('invoices').update({
    status:   'paid',
    paid_at:  now,
  }).eq('id', invoiceId)

  // Record in payments table
  await supabase.from('payments').insert({
    invoice_id:          invoiceId,
    student_id:          invoice.student_id,
    property_id:         invoice.property_id,
    amount:              invoice.total_amount,
    type:                'rent',
    razorpay_payment_id: invoice.upi_txn_id || null, // reuse field for txn ID
    status:              'captured',
    platform_fee:        0,
    paid_at:             now,
  })

  // Update analytics
  const today = now.split('T')[0]
  const { data: snap } = await supabase
    .from('analytics_snapshots')
    .select('id, total_revenue')
    .eq('property_id', invoice.property_id)
    .eq('snapshot_date', today)
    .maybeSingle()

  if (snap) {
    await supabase.from('analytics_snapshots')
      .update({ total_revenue: (snap.total_revenue || 0) + invoice.total_amount })
      .eq('id', snap.id)
  } else {
    await supabase.from('analytics_snapshots').insert({
      property_id:   invoice.property_id,
      snapshot_date: today,
      total_revenue: invoice.total_amount,
    })
  }

  // Email student
  if (invoice.users) {
    sendPaymentSuccessEmail(invoice.users, invoice, {
      razorpay_payment_id: invoice.upi_txn_id || 'UPI',
    }).catch(console.error)
  }

  return NextResponse.json({ success: true, status: 'paid' })
}