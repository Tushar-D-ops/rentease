import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { createRazorpayOrder } from '@/lib/razorpay/client'
import { sendInvoiceEmail } from '@/lib/email'
import { format, addDays, startOfMonth } from 'date-fns'

export async function GET(req) {
  const cronSecret = req.headers.get('authorization')
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getSupabaseAdmin()
  const today = new Date()
  const billingMonth = format(startOfMonth(today), 'yyyy-MM-dd')
  const dueDate = format(addDays(startOfMonth(today), 4), 'yyyy-MM-dd')
  const { data: enrollments } = await supabase.from('enrollments').select('id,student_id,property_id,monthly_rent,users(id,full_name,email),properties(id,name,city)').eq('status','active')
  if (!enrollments?.length) return NextResponse.json({ message: 'No active enrollments' })
  const results = { success:0, skipped:0, failed:0 }
  for (const enrollment of enrollments) {
    try {
      const { data: existing } = await supabase.from('invoices').select('id').eq('enrollment_id',enrollment.id).eq('billing_month',billingMonth).single()
      if (existing) { results.skipped++; continue }
      const { data: elecBill } = await supabase.from('electricity_bills').select('total_amount').eq('property_id',enrollment.property_id).eq('billing_month',billingMonth).single()
      const electricityAmount = elecBill?.total_amount || 0
      const totalAmount = enrollment.monthly_rent + electricityAmount
      const { data: invoice, error: invoiceErr } = await supabase.from('invoices').insert({ enrollment_id:enrollment.id, student_id:enrollment.student_id, property_id:enrollment.property_id, billing_month:billingMonth, base_rent:enrollment.monthly_rent, electricity_amount:electricityAmount, late_fee:0, discount:0, total_amount:totalAmount, due_date:dueDate, status:'pending' }).select().single()
      if (invoiceErr) throw invoiceErr
      const order = await createRazorpayOrder({ amount:totalAmount, invoiceId:invoice.id, studentId:enrollment.student_id })
      await supabase.from('invoices').update({ razorpay_order_id: order.id }).eq('id', invoice.id)
      const enriched = { ...invoice, billing_month_label:format(new Date(billingMonth),'MMMM yyyy'), due_date_label:format(new Date(dueDate),'do MMMM yyyy') }
      await sendInvoiceEmail(enrollment.users, enriched, enrollment.properties)
      results.success++
    } catch (err) { console.error(`Failed for enrollment ${enrollment.id}:`, err); results.failed++ }
  }
  return NextResponse.json({ success:true, results, billingMonth })
}