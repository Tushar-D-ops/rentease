// app/api/payments/create-checkout/route.js
// Creates a Stripe Checkout Session and returns the redirect URL
// Old Razorpay create-order route is preserved at app/api/payments/create-order/route.js

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/stripe/client'

export async function POST(req) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invoiceId } = await req.json()
  if (!invoiceId) return NextResponse.json({ error: 'invoiceId required' }, { status: 400 })

  const supabase = getSupabaseAdmin()

  // Fetch invoice + verify it belongs to this student
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, users!student_id(id, full_name, email, clerk_id), properties!property_id(id, name, city)')
    .eq('id', invoiceId)
    .maybeSingle()

  if (!invoice)
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.users?.clerk_id !== userId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (invoice.status === 'paid')
    return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const session = await createCheckoutSession({
      invoice,
      student:    invoice.users,
      property:   invoice.properties,
      successUrl: `${appUrl}/student/payments?success=true&invoice=${invoiceId}`,
      cancelUrl:  `${appUrl}/student/payments?cancelled=true`,
    })

    // Save the Stripe session ID on the invoice so webhook can look it up
    await supabase
      .from('invoices')
      .update({ stripe_session_id: session.id })
      .eq('id', invoiceId)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[Create Checkout Error]', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}