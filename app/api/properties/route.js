import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { apiRateLimit, cacheGet, cacheSet } from '@/lib/redis/client'
import { rankProperties } from '@/lib/recommendations/scorer'
import { getAllTravelModes } from '@/lib/maps/distance'

// Haversine formula — straight-line km between two coords
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(2))
}

// GET /api/properties
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const maxBudget    = searchParams.get('maxBudget')
  const maxDistance  = searchParams.get('maxDistance')
  const gender       = searchParams.get('gender')
  const collegeLat   = searchParams.get('collegeLat')
  const collegeLng   = searchParams.get('collegeLng')

  // ✅ If student has college coords, use proximity-based fetch (no city filter needed)
  // If not, fall back to city filter for backwards compat
  const city = (!collegeLat || !collegeLng) ? searchParams.get('city') : null

  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('properties')
    .select(`
      id, name, address, city, lat, lng,
      travel_time_walk, travel_time_transit, base_price, current_price,
      gender_restriction, amenities, images, avg_rating, status,
      rooms (id, status, capacity, occupied)
    `)
    .eq('status', 'approved')

  if (city)      query = query.ilike('city', `%${city}%`)
  if (maxBudget) query = query.lte('current_price', parseInt(maxBudget))
  if (gender && gender !== 'any') {
    query = query.or(`gender_restriction.eq.any,gender_restriction.eq.${gender}`)
  }

  const { data: properties, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let filtered = properties || []

  // ✅ Core fix: compute real-time distance from student's college to each property
  // and hard-filter to only nearby ones (default 10km radius)
  if (collegeLat && collegeLng) {
    const cLat = parseFloat(collegeLat)
    const cLng = parseFloat(collegeLng)
    const radiusKm = maxDistance ? parseFloat(maxDistance) : 10 // default 10km radius

    filtered = filtered
      .map(p => ({
        ...p,
        // ✅ Overwrite distance_km with live-computed distance from THIS student's college
        distance_km: (p.lat && p.lng) ? haversineKm(cLat, cLng, p.lat, p.lng) : null,
      }))
      .filter(p => {
        // Drop properties with no coordinates
        if (!p.lat || !p.lng) return false
        // ✅ Hard filter: only show properties within radius of student's college
        return p.distance_km !== null && p.distance_km <= radiusKm
      })
  }

  const prefs = {
    maxBudget:   maxBudget   ? parseInt(maxBudget)     : undefined,
    maxDistance: maxDistance ? parseFloat(maxDistance) : 10,
    gender,
  }

  const ranked = rankProperties(filtered, prefs)
  return NextResponse.json(ranked)
}

// POST /api/properties — Owner creates property (unchanged)
export async function POST(req) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { success } = await apiRateLimit.limit(userId)
  if (!success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const supabase = getSupabaseAdmin()

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