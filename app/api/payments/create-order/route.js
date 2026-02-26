import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createRazorpayOrder } from '@/lib/razorpay/client'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { apiRateLimit } from '@/lib/redis/client'

export async function POST(req) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { success } = await apiRateLimit.limit(userId)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  const { invoiceId } = await req.json()
  if (!invoiceId) return NextResponse.json({ error: 'invoiceId required' }, { status: 400 })
  const supabase = getSupabaseAdmin()
  const { data: invoice } = await supabase.from('invoices').select('*, users!inner(clerk_id)').eq('id', invoiceId).single()
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.users.clerk_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (invoice.status === 'paid') return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 })
  try {
    if (invoice.razorpay_order_id) return NextResponse.json({ orderId: invoice.razorpay_order_id })
    const order = await createRazorpayOrder({ amount: invoice.total_amount, invoiceId: invoice.id, studentId: invoice.student_id })
    await supabase.from('invoices').update({ razorpay_order_id: order.id }).eq('id', invoiceId)
    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency, invoiceId: invoice.id })
  } catch (err) {
    console.error('[Create Order Error]', err)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}