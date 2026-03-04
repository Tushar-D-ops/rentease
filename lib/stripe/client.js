// ─────────────────────────────────────────────────────────────────────────────
// lib/stripe/client.js
// Stripe payment integration — replaces Razorpay for test + production use
// Razorpay code is preserved in lib/razorpay/client.js (commented out)
// ─────────────────────────────────────────────────────────────────────────────

import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
})

// Create a Stripe Checkout Session for an invoice
export async function createCheckoutSession({ invoice, student, property, successUrl, cancelUrl }) {
  const amountInPaise = invoice.total_amount  // already in paise (smallest unit)
  // Stripe uses smallest currency unit too (paise for INR)

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: student.email,

    line_items: [
      {
        price_data: {
          currency: 'inr',
          unit_amount: amountInPaise,
          product_data: {
            name: `Rent — ${new Date(invoice.billing_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`,
            description: `${property?.name || 'PG Accommodation'} · Base rent ₹${(invoice.base_rent / 100).toLocaleString('en-IN')}${invoice.electricity_amount > 0 ? ` + Electricity ₹${(invoice.electricity_amount / 100).toLocaleString('en-IN')}` : ''}${invoice.late_fee > 0 ? ` + Late fee ₹${(invoice.late_fee / 100).toLocaleString('en-IN')}` : ''}`,
            images: ['https://i.imgur.com/8M7e2Qk.png'], // RentEase logo placeholder
          },
        },
        quantity: 1,
      },
    ],

    metadata: {
      invoice_id:  invoice.id,
      student_id:  student.id,
      property_id: invoice.property_id,
    },

    success_url: successUrl,
    cancel_url:  cancelUrl,
  })

  return session
}

// Verify Stripe webhook signature
export function constructStripeEvent(body, signature) {
  return stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  )
}