import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { chatWithGemini } from '@/lib/ai/gemini'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { apiRateLimit } from '@/lib/redis/client'

export async function POST(req) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { success } = await apiRateLimit.limit(`ai:${userId}`)
  if (!success) return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 })
  const { messages } = await req.json()
  if (!messages?.length) return NextResponse.json({ error: 'messages required' }, { status: 400 })
  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase.from('users').select('id,role').eq('clerk_id', userId).single()
  let userContext = {}
  if (user) {
    const { data: enrollment } = await supabase.from('enrollments').select('monthly_rent,properties(name,city)').eq('student_id',user.id).eq('status','active').single()
    if (enrollment) userContext = { enrollment: { property_name: enrollment.properties?.name, monthly_rent: enrollment.monthly_rent } }
  }
  try {
    const reply = await chatWithGemini(messages, userContext)
    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[AI Chat Error]', err)
    return NextResponse.json({ error: 'AI service unavailable.' }, { status: 503 })
  }
}