import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { apiRateLimit, cacheGet, cacheSet } from '@/lib/redis/client'
import { rankProperties } from '@/lib/recommendations/scorer'
import { getAllTravelModes } from '@/lib/maps/distance'

// GET /api/properties?city=Pune&maxBudget=10000&maxDistance=3&gender=male
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const city = searchParams.get('city')
  const maxBudget = searchParams.get('maxBudget')
  const maxDistance = searchParams.get('maxDistance')
  const gender = searchParams.get('gender')
  const collegeLat = searchParams.get('collegeLat')
  const collegeLng = searchParams.get('collegeLng')

  // Cache key
  const cacheKey = `properties:${city}:${maxBudget}:${maxDistance}:${gender}`
  const cached = await cacheGet(cacheKey)
  if (cached && !collegeLat) return NextResponse.json(cached)

  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('properties')
    .select(`
      id, name, address, city, lat, lng, distance_km,
      travel_time_walk, travel_time_transit, base_price, current_price,
      gender_restriction, amenities, images, avg_rating, status,
      rooms (id, status, capacity, occupied)
    `)
    .eq('status', 'approved')

  if (city) query = query.ilike('city', `%${city}%`)
  if (maxBudget) query = query.lte('current_price', parseInt(maxBudget) * 100)
  if (gender && gender !== 'any') {
    query = query.or(`gender_restriction.eq.any,gender_restriction.eq.${gender}`)
  }

  const { data: properties, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Rank with scoring
  const prefs = {
    maxBudget: maxBudget ? parseInt(maxBudget) * 100 : undefined,
    maxDistance: maxDistance ? parseFloat(maxDistance) : undefined,
    gender,
  }

  const ranked = rankProperties(properties || [], prefs)

  // Cache for 5 minutes (don't cache personalized results)
  if (!collegeLat) await cacheSet(cacheKey, ranked, 300)

  return NextResponse.json(ranked)
}

// POST /api/properties — Owner creates property
export async function POST(req) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { success } = await apiRateLimit.limit(userId)
  if (!success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const supabase = getSupabaseAdmin()

  // Verify owner role
  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', userId)
    .single()

  if (!user || user.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 })
  }

  const body = await req.json()
  const {
    name, description, address, city, lat, lng,
    base_price, gender_restriction, amenities,
    dynamic_pricing_enabled, college_lat, college_lng,
  } = body

  // Calculate distance from college using OSRM
  let distance_km = null
  let travel_time_walk = null
  let travel_time_transit = null

  if (college_lat && college_lng) {
    try {
      const routes = await getAllTravelModes(
        { lat: parseFloat(college_lat), lng: parseFloat(college_lng) },
        { lat: parseFloat(lat), lng: parseFloat(lng) }
      )
      distance_km = routes.walk.distance_km
      travel_time_walk = routes.walk.duration_min
      travel_time_transit = routes.drive.duration_min
    } catch (err) {
      console.error('Distance calculation failed:', err)
    }
  }

  const pricePaise = Math.floor(parseFloat(base_price) * 100)

  const { data: property, error } = await supabase
    .from('properties')
    .insert({
      owner_id: user.id,
      name, description, address, city,
      lat: parseFloat(lat), lng: parseFloat(lng),
      distance_km, travel_time_walk, travel_time_transit,
      base_price: pricePaise,
      current_price: pricePaise,
      gender_restriction: gender_restriction || 'any',
      amenities: amenities || [],
      dynamic_pricing_enabled: dynamic_pricing_enabled || false,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(property, { status: 201 })
}