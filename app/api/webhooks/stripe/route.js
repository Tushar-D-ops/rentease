// app/api/webhooks/stripe/route.js
// Handles Stripe webhook events — replaces Razorpay webhook
// Old Razorpay webhook preserved at app/api/webhooks/razorpay/route.js

import { NextResponse } from 'next/server'
import { constructStripeEvent } from '@/lib/stripe/client'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { sendPaymentSuccessEmail, sendPaymentFailedEmail } from '@/lib/email'



export async function POST(req) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event
  try {
    event = constructStripeEvent(body, signature)
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook signature invalid: ${err.message}` }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  try {
    switch (event.type) {

      // ── Payment succeeded ───────────────────────────────────────────
      case 'checkout.session.completed': {
        const session   = event.data.object
        const invoiceId = session.metadata?.invoice_id
        const studentId = session.metadata?.student_id
        const propertyId = session.metadata?.property_id

        if (!invoiceId) {
          console.error('[Stripe Webhook] No invoice_id in session metadata')
          break
        }

        // Fetch full invoice + student + property + owner
        const { data: invoice } = await supabase
          .from('invoices')
          .select('*, users!student_id(id, full_name, email), properties!property_id(id, name, owner_id)')
          .eq('id', invoiceId)
          .maybeSingle()

        if (!invoice) {
          console.error('[Stripe Webhook] Invoice not found:', invoiceId)
          break
        }

        if (invoice.status === 'paid') {
          console.log('[Stripe Webhook] Invoice already paid, skipping:', invoiceId)
          break
        }

        const now = new Date().toISOString()

        // ── Mark invoice as paid ──
        await supabase
          .from('invoices')
          .update({
            status:             'paid',
            stripe_payment_id:  session.payment_intent,
            paid_at:            now,
          })
          .eq('id', invoiceId)

        // ── Record in payments table ──
  const { data: payData, error: payErr } = await supabase.from('payments').insert({
  invoice_id:          invoiceId,
  student_id:          invoice.student_id,
  property_id:         invoice.property_id,
  amount:              invoice.total_amount,
  type:                'rent',
  payment_intent_id:   session.payment_intent,
  checkout_session_id: session.id,
  status:              'captured',
  platform_fee:        Math.floor(invoice.total_amount * 0.01),
  paid_at:             now,
})
console.error('[Webhook] Payment insert error:', payErr)
console.log('[Webhook] Payment insert data:', payData)
        

        // ── Update analytics snapshot ──
        const today = now.split('T')[0]
        const { data: snap } = await supabase
          .from('analytics_snapshots')
          .select('id, total_revenue')
          .eq('property_id', invoice.property_id)
          .eq('snapshot_date', today)
          .maybeSingle()

        if (snap) {
          await supabase
            .from('analytics_snapshots')
            .update({ total_revenue: (snap.total_revenue || 0) + invoice.total_amount })
            .eq('id', snap.id)
        } else {
          await supabase.from('analytics_snapshots').insert({
            property_id:   invoice.property_id,
            snapshot_date: today,
            total_revenue: invoice.total_amount,
          })
        }

        // ── Email student ──
        if (invoice.users) {
          sendPaymentSuccessEmail(
            invoice.users,
            {
              ...invoice,
              billing_month_label: new Date(invoice.billing_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
            },
            { razorpay_payment_id: session.payment_intent }
          ).catch(err => console.error('[Stripe Webhook] Student email error:', err))
        }

        // ── Email owner ──
        if (invoice.properties?.owner_id) {
          const { data: owner } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', invoice.properties.owner_id)
            .maybeSingle()

          if (owner?.email) {
            sendOwnerPaymentReceivedEmail(owner, invoice, invoice.users).catch(
              err => console.error('[Stripe Webhook] Owner email error:', err)
            )
          }
        }

        console.log(`[Stripe Webhook] Invoice ${invoiceId} marked paid ✅`)
        break
      }

      // ── Payment failed / expired ────────────────────────────────────
      case 'checkout.session.expired': {
        const session   = event.data.object
        const invoiceId = session.metadata?.invoice_id
        if (!invoiceId) break

        const { data: invoice } = await supabase
          .from('invoices')
          .select('*, users!student_id(full_name, email)')
          .eq('id', invoiceId)
          .maybeSingle()

        if (invoice?.users) {
          sendPaymentFailedEmail(invoice.users, invoice).catch(console.error)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[Stripe Webhook] Processing error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// ── Owner notification email ────────────────────────────────────────────────
async function sendOwnerPaymentReceivedEmail(owner, invoice, student) {
  const { sendEmail, baseLayout } = await import('@/lib/email')
  const monthLabel = new Date(invoice.billing_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const amount     = (invoice.total_amount / 100).toLocaleString('en-IN')

  return sendEmail({
    to:      owner.email,
    subject: `💰 Rent Received — ${monthLabel}`,
    html: baseLayout(
      `<p style="color:#c9d1d9">Hi ${owner.full_name}, you've received a rent payment!</p>
       <div style="background:#0d1117;border-radius:12px;padding:24px;border:1px solid #30363d;margin:20px 0;color:#c9d1d9;font-size:14px;line-height:2">
         <div>Student: <span style="color:#fff;font-weight:600">${student?.full_name || 'Unknown'}</span></div>
         <div>Month: <span style="color:#fff">${monthLabel}</span></div>
         <div>Amount: <span style="color:#4f6ef7;font-weight:700;font-size:18px">₹${amount}</span></div>
         <div>Status: <span style="color:#06d6a0;font-weight:600">Paid via Stripe ✓</span></div>
       </div>
       <a href="${process.env.NEXT_PUBLIC_APP_URL}/owner/billing" style="display:block;text-align:center;background:linear-gradient(135deg,#4f6ef7,#7c3aed);color:#fff;text-decoration:none;padding:14px;border-radius:10px;font-weight:700">View in Dashboard →</a>`,
      'linear-gradient(135deg,#06d6a0,#059669)',
      `<div style="text-align:center"><div style="font-size:48px">💰</div><div style="color:#fff;font-size:20px;font-weight:700;margin-top:12px">Payment Received!</div></div>`
    )
  })
}