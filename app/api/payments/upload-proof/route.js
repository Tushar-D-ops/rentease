import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'  // ✅ required for Buffer and FormData handling

export async function POST(req) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()

  // ✅ Next.js 14 correct way to parse FormData
  let file, invoiceId
  try {
    const formData = await req.formData()
    file      = formData.get('file')
    invoiceId = formData.get('invoiceId')
  } catch (err) {
    console.error('[upload-proof] FormData parse error:', err)
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  if (!file || !invoiceId) {
    return NextResponse.json({ error: 'Missing file or invoiceId' }, { status: 400 })
  }

  // Verify the invoice belongs to this student
  const { data: student } = await supabase
    .from('users').select('id').eq('clerk_id', userId).maybeSingle()
  if (!student) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: invoice } = await supabase
    .from('invoices').select('id, student_id').eq('id', invoiceId).maybeSingle()
  if (!invoice || invoice.student_id !== student.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Convert file to Buffer for Supabase upload
  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Build file path and get extension
  const originalName = file.name || 'screenshot.jpg'
  const ext  = originalName.split('.').pop() || 'jpg'
  const path = `${invoiceId}/${Date.now()}.${ext}`

  // Upload using admin client — bypasses RLS
  const { error: uploadErr } = await supabase.storage
    .from('payment-proofs')
    .upload(path, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert:      true,
    })

  if (uploadErr) {
    console.error('[upload-proof] Supabase storage error:', uploadErr)
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('payment-proofs')
    .getPublicUrl(path)

  return NextResponse.json({ success: true, url: publicUrl })
}