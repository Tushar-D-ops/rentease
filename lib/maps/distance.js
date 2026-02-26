// 100% FREE — no API key needed
// Uses OSRM (Open Source Routing Machine) public API
// Uses Nominatim for geocoding (OpenStreetMap)

const OSRM_BASE = 'https://router.project-osrm.org/route/v1'
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

export async function geocodeAddress(address) {
  const encoded = encodeURIComponent(address)
  const res = await fetch(`${NOMINATIM_BASE}/search?q=${encoded}&format=json&limit=1`, {
    headers: { 'User-Agent': 'RentEase/1.0 (rentease.in)' },
  })
  const data = await res.json()
  if (!data.length) throw new Error(`Could not geocode: ${address}`)
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name }
}

export async function getWalkingRoute(from, to)  { return getRoute(from, to, 'foot') }
export async function getCyclingRoute(from, to)  { return getRoute(from, to, 'bike') }
export async function getDrivingRoute(from, to)  { return getRoute(from, to, 'car')  }

async function getRoute(from, to, profile = 'foot') {
  const url = `${OSRM_BASE}/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'RentEase/1.0' } })
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.length) return fallbackHaversine(from, to)
    const route = data.routes[0]
    return {
      distance_km: parseFloat((route.distance / 1000).toFixed(2)),
      duration_min: Math.round(route.duration / 60),
      profile,
    }
  } catch { return fallbackHaversine(from, to) }
}

export async function getAllTravelModes(from, to) {
  const [walk, bike, drive] = await Promise.all([
    getWalkingRoute(from, to),
    getCyclingRoute(from, to),
    getDrivingRoute(from, to),
  ])
  return { walk, bike, drive }
}

function fallbackHaversine(from, to) {
  const R = 6371
  const dLat = deg2rad(to.lat - from.lat)
  const dLng = deg2rad(to.lng - from.lng)
  const a = Math.sin(dLat/2)**2 + Math.cos(deg2rad(from.lat))*Math.cos(deg2rad(to.lat))*Math.sin(dLng/2)**2
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return { distance_km: parseFloat(dist.toFixed(2)), duration_min: Math.round(dist*12), profile: 'estimated' }
}

function deg2rad(deg) { return deg * (Math.PI / 180) }

export function formatTravelTime(minutes) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60), m = minutes % 60
  return m ? `${h}h ${m}min` : `${h}h`
}