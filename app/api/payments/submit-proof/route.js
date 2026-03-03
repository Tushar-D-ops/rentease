import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function POST(req) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()

  const { invoiceId, paymentProofUrl, upiTxnId } = await req.json()

  if (!invoiceId || !paymentProofUrl || !upiTxnId)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  // Verify invoice belongs to this student
  const { data: student } = await supabase
    .from('users').select('id').eq('clerk_id', userId).maybeSingle()
  if (!student) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: invoice } = await supabase
    .from('invoices').select('id, student_id, status').eq('id', invoiceId).maybeSingle()
  if (!invoice)
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.student_id !== student.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['pending', 'overdue'].includes(invoice.status))
    return NextResponse.json({ error: 'Invoice cannot be updated' }, { status: 400 })

  const { error } = await supabase
    .from('invoices')
    .update({
      status:            'under_review',
      payment_proof_url: paymentProofUrl,
      upi_txn_id:        upiTxnId,
    })
    .eq('id', invoiceId)

  if (error) {
    console.error('[submit-proof]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}