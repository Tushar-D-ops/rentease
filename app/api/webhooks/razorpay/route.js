import { NextResponse } from 'next/server'
import { verifyRazorpayWebhook } from '@/lib/razorpay/client'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { sendPaymentSuccessEmail, sendPaymentFailedEmail } from '@/lib/email'

export async function POST(req) {
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature')

  // Verify webhook signature
  if (!signature || !verifyRazorpayWebhook(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  const event = JSON.parse(body)
  const supabase = getSupabaseAdmin()

  try {
    switch (event.event) {
      case 'payment.captured': {
        const payment = event.payload.payment.entity
        const orderId = payment.order_id
        const paymentId = payment.id
        const signature = payment.signature || ''

        // Get invoice by order ID
        const { data: invoice } = await supabase
          .from('invoices')
          .select('*, users(full_name, email)')
          .eq('razorpay_order_id', orderId)
          .single()

        if (!invoice) break

        // Update invoice status
        await supabase
          .from('invoices')
          .update({
            status: 'paid',
            razorpay_payment_id: paymentId,
            paid_at: new Date().toISOString(),
          })
          .eq('id', invoice.id)

        // Record payment
        await supabase.from('payments').insert({
          invoice_id: invoice.id,
          student_id: invoice.student_id,
          amount: payment.amount,
          type: 'rent',
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          status: 'captured',
          platform_fee: Math.floor(payment.amount * 0.01),
          paid_at: new Date().toISOString(),
        })

        // Update analytics snapshot
        await updateAnalyticsRevenue(supabase, invoice.property_id, payment.amount)

        // Send success email
        if (invoice.users) {
          await sendPaymentSuccessEmail(invoice.users, invoice, { razorpay_payment_id: paymentId })
        }
        break
      }

      case 'payment.failed': {
        const payment = event.payload.payment.entity
        const orderId = payment.order_id

        const { data: invoice } = await supabase
          .from('invoices')
          .select('*, users(full_name, email)')
          .eq('razorpay_order_id', orderId)
          .single()

        if (!invoice) break

        await supabase.from('payments').insert({
          invoice_id: invoice.id,
          student_id: invoice.student_id,
          amount: payment.amount,
          type: 'rent',
          razorpay_order_id: orderId,
          status: 'failed',
        })

        if (invoice.users) {
          await sendPaymentFailedEmail(invoice.users, invoice)
        }
        break
      }

      case 'refund.created': {
        const refund = event.payload.refund.entity
        await supabase.from('payments').insert({
          invoice_id: null,
          student_id: null,
          amount: refund.amount,
          type: 'refund',
          razorpay_payment_id: refund.payment_id,
          status: 'refunded',
        })
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[Webhook Error]', err)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

async function updateAnalyticsRevenue(supabase, propertyId, amount) {
  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await supabase
    .from('analytics_snapshots')
    .select('id, total_revenue')
    .eq('property_id', propertyId)
    .eq('snapshot_date', today)
    .single()

  if (existing) {
    await supabase
      .from('analytics_snapshots')
      .update({ total_revenue: (existing.total_revenue || 0) + amount })
      .eq('id', existing.id)
  } else {
    await supabase.from('analytics_snapshots').insert({
      property_id: propertyId,
      snapshot_date: today,
      total_revenue: amount,
    })
  }
}