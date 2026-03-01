import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { sendPaymentReminderEmail, sendLateFeeEmail } from '@/lib/email'
import { format, startOfMonth } from 'date-fns'

export async function GET(req) {
  // const cronSecret = req.headers.get('authorization')
  // if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // const supabase = getSupabaseAdmin()
  // const today = new Date()
  // const dayOfMonth = today.getDate()
  // const billingMonth = format(startOfMonth(today), 'yyyy-MM-dd')
  // const { data: unpaidInvoices } = await supabase.from('invoices').select('*,users(full_name,email)').eq('billing_month',billingMonth).neq('status','paid').neq('status','waived')
  // if (!unpaidInvoices?.length) return NextResponse.json({ message: 'No unpaid invoices', dayOfMonth })
  // const results = { reminders:0, lateFees:0, flagged:0 }
  // for (const invoice of unpaidInvoices) {
  //   try {
  //     const enriched = { ...invoice, billing_month_label:format(new Date(billingMonth),'MMMM yyyy'), due_date_label:format(new Date(invoice.due_date),'do MMMM') }
  //     if (dayOfMonth === 5)  { await sendPaymentReminderEmail(invoice.users, enriched); results.reminders++ }
  //     if (dayOfMonth === 10 && invoice.late_fee === 0) {
  //       const lateFee = Math.floor(invoice.base_rent * 0.02)
  //       await supabase.from('invoices').update({ late_fee:lateFee, total_amount:invoice.total_amount+lateFee, status:'overdue' }).eq('id',invoice.id)
  //       await sendLateFeeEmail(invoice.users, { ...enriched, late_fee:lateFee, total_amount:invoice.total_amount+lateFee })
  //       results.lateFees++
  //     }
  //     if (dayOfMonth === 15) {
  //       await supabase.from('invoices').update({ status:'overdue' }).eq('id',invoice.id)
  //       await supabase.from('users').update({ account_flagged:true }).eq('id',invoice.student_id)
  //       results.flagged++
  //     }
  //   } catch (err) { console.error(`Reminder error for invoice ${invoice.id}:`, err) }
  // }
  // return NextResponse.json({ success:true, dayOfMonth, results })
  return NextResponse.json({ success: true })
}