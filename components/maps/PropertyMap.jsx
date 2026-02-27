'use client'
import { useEffect, useRef } from 'react'

export default function PropertyMap({ properties = [], collegeLat, collegeLng, height = '400px' }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!mapRef.current) return

    import('leaflet').then((L) => {
      // ✅ Guard: if component already unmounted by the time import resolves
      if (!mapRef.current) return

      // ✅ Destroy any existing instance stored in our ref
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      // ✅ THE FIX: Reset Leaflet's internal flag on the DOM node itself
      // This is what causes "already initialized" — Leaflet stamps _leaflet_id
      // on the div, and if cleanup didn't clear it, the next init throws
      if (mapRef.current._leaflet_id) {
        mapRef.current._leaflet_id = null
      }

      const centerLat = collegeLat || properties[0]?.lat || 18.5204
      const centerLng = collegeLng || properties[0]?.lng || 73.8567

      const map = L.map(mapRef.current, { center: [centerLat, centerLng], zoom: 14 })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      if (collegeLat && collegeLng) {
        const collegeIcon = L.divIcon({
          html: `<div style="background:#06d6a0;width:40px;height:40px;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 20px rgba(6,214,160,0.4)">🎓</div>`,
          className: '', iconSize: [40, 40], iconAnchor: [20, 20],
        })
        L.marker([collegeLat, collegeLng], { icon: collegeIcon })
          .addTo(map)
          .bindPopup('<b>Your College</b>')
      }

      properties.forEach((prop) => {
        if (!prop.lat || !prop.lng) return
        const available = prop.rooms?.some((r) => r.status === 'available')
        const color = available ? '#4f6ef7' : '#7b82a8'
        const icon = L.divIcon({
          html: `<div style="background:${color};color:#fff;padding:4px 10px;border-radius:100px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3)">₹${Math.floor(prop.current_price / 100).toLocaleString('en-IN')}</div>`,
          className: '', iconSize: [null, 28], iconAnchor: [0, 14],
        })
        L.marker([prop.lat, prop.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:200px">
              <div style="font-weight:700;font-size:14px;margin-bottom:4px">${prop.name}</div>
              <div style="color:#666;font-size:12px;margin-bottom:8px">${prop.address}</div>
              <div style="display:flex;justify-content:space-between">
                <span style="color:#4f6ef7;font-weight:700">₹${Math.floor(prop.current_price / 100).toLocaleString('en-IN')}/mo</span>
                ${prop.distance_km ? `<span style="color:#06d6a0;font-size:12px">📍 ${prop.distance_km}km</span>` : ''}
              </div>
            </div>`)
      })

      mapInstanceRef.current = map
    })

    return () => {
      // ✅ Cleanup: destroy instance AND reset the DOM node's leaflet flag
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      if (mapRef.current) {
        mapRef.current._leaflet_id = null
      }
    }
  }, [properties, collegeLat, collegeLng])

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%', borderRadius: '16px', overflow: 'hidden' }}
      className="border border-white/5"
    />
  )
}