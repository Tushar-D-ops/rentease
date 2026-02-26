import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { generateQRToken, generateQRCodeDataURL } from '@/lib/qr/generator'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase.from('users').select('id,qr_token').eq('clerk_id', userId).single()
  if (!user?.qr_token) return NextResponse.json({ error: 'No QR generated yet' }, { status: 404 })
  const dataURL = await generateQRCodeDataURL(user.qr_token)
  return NextResponse.json({ token: user.qr_token, qrDataURL: dataURL })
}

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase.from('users').select('id,qr_token,role').eq('clerk_id', userId).single()
  if (!user || user.role !== 'student') return NextResponse.json({ error: 'Students only' }, { status: 403 })
  let token = user.qr_token
  if (!token) {
    token = generateQRToken(user.id)
    await supabase.from('users').update({ qr_token: token }).eq('id', user.id)
  }
  const dataURL = await generateQRCodeDataURL(token)
  return NextResponse.json({ token, qrDataURL: dataURL })
}