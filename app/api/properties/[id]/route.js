import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { cacheGet, cacheSet } from '@/lib/redis/client'

export async function GET(req, { params }) {
  const { id } = params
  const cacheKey = `property:${id}`

  const cached = await cacheGet(cacheKey)
  if (cached) return NextResponse.json(cached)

  const supabase = getSupabaseAdmin()

  // Use users!owner_id to disambiguate the FK join (properties.owner_id -> users.id)
  const { data: property, error } = await supabase
    .from('properties')
    .select('*, rooms(id, room_number, room_type, floor_number, status, capacity, occupied), users!owner_id(full_name)')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[GET /api/properties/[id]]', error.message)
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }

  await cacheSet(cacheKey, property, 120)

  return NextResponse.json(property)
}