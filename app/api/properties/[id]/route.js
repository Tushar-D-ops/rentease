import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { cacheGet, cacheSet } from '@/lib/redis/client'

export async function GET(req, { params }) {
  const { id } = params
  const cacheKey = `property:${id}`

  const cached = await cacheGet(cacheKey)
  if (cached) return NextResponse.json(cached)

  const supabase = getSupabaseAdmin()
  const { data: property, error } = await supabase
    .from('properties')
    .select('*,rooms(*),users(full_name)')
    .eq('id', id)
    .single()

  if (error || !property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  await cacheSet(cacheKey, property, 120) // cache 2 min

  return NextResponse.json(property)
}