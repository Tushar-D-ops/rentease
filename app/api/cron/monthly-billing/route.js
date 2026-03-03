// import { NextResponse } from 'next/server'
// import { getSupabaseAdmin } from '@/lib/supabase/server'
// import { createRazorpayOrder } from '@/lib/razorpay/client'
// import { sendInvoiceEmail } from '@/lib/email'
// import { format, addDays, startOfMonth } from 'date-fns'

// export async function GET(req) {
//   const cronSecret = req.headers.get('authorization')
//   if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//   const supabase = getSupabaseAdmin()
//   const today = new Date()
//   const billingMonth = format(startOfMonth(today), 'yyyy-MM-dd')
//   const dueDate = format(addDays(startOfMonth(today), 4), 'yyyy-MM-dd')
//   const { data: enrollments } = await supabase.from('enrollments').select('id,student_id,property_id,monthly_rent,users(id,full_name,email),properties(id,name,city)').eq('status','active')
//   if (!enrollments?.length) return NextResponse.json({ message: 'No active enrollments' })
//   const results = { success:0, skipped:0, failed:0 }
//   for (const enrollment of enrollments) {
//     try {
//       const { data: existing } = await supabase.from('invoices').select('id').eq('enrollment_id',enrollment.id).eq('billing_month',billingMonth).single()
//       if (existing) { results.skipped++; continue }
//       const { data: elecBill } = await supabase.from('electricity_bills').select('total_amount').eq('property_id',enrollment.property_id).eq('billing_month',billingMonth).single()
//       const electricityAmount = elecBill?.total_amount || 0
//       const totalAmount = enrollment.monthly_rent + electricityAmount
//       const { data: invoice, error: invoiceErr } = await supabase.from('invoices').insert({ enrollment_id:enrollment.id, student_id:enrollment.student_id, property_id:enrollment.property_id, billing_month:billingMonth, base_rent:enrollment.monthly_rent, electricity_amount:electricityAmount, late_fee:0, discount:0, total_amount:totalAmount, due_date:dueDate, status:'pending' }).select().single()
//       if (invoiceErr) throw invoiceErr
//       const order = await createRazorpayOrder({ amount:totalAmount, invoiceId:invoice.id, studentId:enrollment.student_id })
//       await supabase.from('invoices').update({ razorpay_order_id: order.id }).eq('id', invoice.id)
//       const enriched = { ...invoice, billing_month_label:format(new Date(billingMonth),'MMMM yyyy'), due_date_label:format(new Date(dueDate),'do MMMM yyyy') }
//       await sendInvoiceEmail(enrollment.users, enriched, enrollment.properties)
//       results.success++
//     } catch (err) { console.error(`Failed for enrollment ${enrollment.id}:`, err); results.failed++ }
//   }
//   return NextResponse.json({ success:true, results, billingMonth })
//   // return NextResponse.json({ success: true })
// }




import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { sendInvoiceEmail } from '@/lib/email'
import { format, addDays, startOfMonth } from 'date-fns'

// ✅ Razorpay import REMOVED — UPI flow doesn't need pre-created orders
// Razorpay is still in lib/razorpay/client.js for future use — just not called here

export async function GET(req) {
  const cronSecret = req.headers.get('authorization')
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase     = getSupabaseAdmin()
  const today        = new Date()
  const billingMonth = format(startOfMonth(today), 'yyyy-MM-dd')
  const dueDate      = format(addDays(startOfMonth(today), 9), 'yyyy-MM-dd') // due on the 10th

  // Fetch all active enrollments with student + property info
  const { data: enrollments, error: enrollErr } = await supabase
    .from('enrollments')
    .select('id, student_id, property_id, room_id, monthly_rent, users!student_id(id, full_name, email), properties!property_id(id, name, city)')
    .eq('status', 'active')

  if (enrollErr) {
    console.error('[Billing] Enrollment fetch error:', enrollErr)
    return NextResponse.json({ error: enrollErr.message }, { status: 500 })
  }

  if (!enrollments?.length) {
    return NextResponse.json({
      message: 'No active enrollments',
      results: { success: 0, skipped: 0, failed: 0 },
    })
  }

  const results = { success: 0, skipped: 0, failed: 0 }

  for (const enrollment of enrollments) {
    try {

      // ── 1. Skip if invoice already exists for this month ──────────
      const { data: existing } = await supabase
        .from('invoices')
        .select('id')
        .eq('enrollment_id', enrollment.id)
        .eq('billing_month', billingMonth)
        .maybeSingle()   // ✅ was .single() — threw 406 when no row existed

      if (existing) {
        results.skipped++
        continue
      }

      // ── 2. Find electricity bill (room-specific → property-wide → 0) ──
      let electricityAmount = 0

      if (enrollment.room_id) {
        // Try room-specific bill first
        const { data: roomBill } = await supabase
          .from('electricity_bills')
          .select('total_amount')
          .eq('property_id', enrollment.property_id)
          .eq('billing_month', billingMonth)
          .eq('room_id', enrollment.room_id)
          .maybeSingle()

        if (roomBill) {
          electricityAmount = roomBill.total_amount
        } else {
          // Fall back to whole-property shared meter
          const { data: propBill } = await supabase
            .from('electricity_bills')
            .select('total_amount')
            .eq('property_id', enrollment.property_id)
            .eq('billing_month', billingMonth)
            .is('room_id', null)
            .maybeSingle()
          electricityAmount = propBill?.total_amount || 0
        }
      } else {
        // No specific room — use whole-property bill
        const { data: propBill } = await supabase
          .from('electricity_bills')
          .select('total_amount')
          .eq('property_id', enrollment.property_id)
          .eq('billing_month', billingMonth)
          .is('room_id', null)
          .maybeSingle()
        electricityAmount = propBill?.total_amount || 0
      }

      const totalAmount = enrollment.monthly_rent + electricityAmount

      // ── 3. Create invoice ──────────────────────────────────────────
      const { data: invoice, error: invoiceErr } = await supabase
        .from('invoices')
        .insert({
          enrollment_id:      enrollment.id,
          student_id:         enrollment.student_id,
          property_id:        enrollment.property_id,
          billing_month:      billingMonth,
          base_rent:          enrollment.monthly_rent,
          electricity_amount: electricityAmount,
          late_fee:           0,
          discount:           0,
          total_amount:       totalAmount,
          due_date:           dueDate,
          status:             'pending',
          // razorpay_order_id intentionally omitted — UPI payment needs no pre-order
        })
        .select()
        .single()

      if (invoiceErr) throw invoiceErr

      // ── 4. Send invoice email (non-blocking) ──────────────────────
      const enriched = {
        ...invoice,
        billing_month_label: format(new Date(billingMonth), 'MMMM yyyy'),
        due_date_label:      format(new Date(dueDate), 'do MMMM yyyy'),
      }

      sendInvoiceEmail(enrollment.users, enriched, enrollment.properties)
        .catch(err => console.error(`[Billing] Email failed for enrollment ${enrollment.id}:`, err.message))

      results.success++

    } catch (err) {
      console.error(`[Billing] Failed for enrollment ${enrollment.id}:`, err.message)
      results.failed++
    }
  }

  console.log(`[Billing] Done — Month: ${billingMonth}`, results)
  return NextResponse.json({ success: true, results, billingMonth })
}