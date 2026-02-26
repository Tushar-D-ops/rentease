import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(req) {
  const { userId } = await auth()

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role, college, phone } = await req.json()

  if (!role || !['student','owner'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  
    const supabase = getSupabaseAdmin()

  const clerkUser = await (await clerkClient()).users.getUser(userId)

  const email = clerkUser.emailAddresses[0]?.emailAddress

  const fullName = `${clerkUser.firstName||''} ${clerkUser.lastName||''}`.trim()

  const { data: existing } = await supabase.from('users').select('id').eq('clerk_id', userId).single()

  if (existing) return NextResponse.json({ message: 'Already onboarded' })

  const { data: newUser, error } = await supabase.from('users').insert({
    clerk_id: userId, email, full_name: fullName||email, phone: phone||null, role, college_name: college||null,
  }).select().single()

  if (error) return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })

  await (await clerkClient()).users.updateUserMetadata(userId, { publicMetadata: { role, supabase_id: newUser.id } })

  sendWelcomeEmail(newUser).catch(console.error)
  
  return NextResponse.json({ success: true, user: newUser })
}


