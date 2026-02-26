'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import PropertyCard from '@/components/property/PropertyCard'
import dynamic from 'next/dynamic'
import { getCategoryWinners } from '@/lib/recommendations/scorer'

const PropertyMap = dynamic(() => import('@/components/maps/PropertyMap'), { ssr: false })

export default function PropertiesPage() {
  const { user } = useUser()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('grid')
  const [filters, setFilters] = useState({ city:'', maxBudget:'', maxDistance:'', gender:'' })
  const [collegeLat, setCollegeLat] = useState(null)
  const [collegeLng, setCollegeLng] = useState(null)
  const [winners, setWinners] = useState({})

  useEffect(() => {
    fetchProperties()
    if (user) fetchCollegeCoords()
  }, [user])

  async function fetchCollegeCoords() {
    const { data: u } = await supabase.from('users').select('college_lat,college_lng').eq('clerk_id', user.id).single()
    if (u?.college_lat) { setCollegeLat(u.college_lat); setCollegeLng(u.college_lng) }
  }

  async function fetchProperties() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.city) params.set('city', filters.city)
    if (filters.maxBudget) params.set('maxBudget', parseInt(filters.maxBudget) * 100)
    if (filters.maxDistance) params.set('maxDistance', filters.maxDistance)
    if (filters.gender) params.set('gender', filters.gender)
    const res = await fetch(`/api/properties?${params}`)
    const data = await res.json()
    setProperties(data || [])
    setWinners(getCategoryWinners(data || []))
    setLoading(false)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">Find Your PG</h1>
        <p className="text-[#7b82a8]">Verified accommodations near your college</p>
      </div>

      {/* Filters */}
      <div className="bg-[#111527] border border-white/5 rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        {[
          { key:'city',        type:'text',   placeholder:'e.g. Pune, Nagpur',   label:'City'             },
          { key:'maxBudget',   type:'number', placeholder:'e.g. 10000',          label:'Max Budget (₹/mo)' },
          { key:'maxDistance', type:'number', placeholder:'e.g. 3',              label:'Max Distance (km)' },
        ].map(({ key, type, placeholder, label }) => (
          <div key={key} className="flex-1 min-w-36">
            <label className="text-xs text-[#7b82a8] mb-1 block">{label}</label>
            <input type={type} placeholder={placeholder} value={filters[key]} onChange={(e) => setFilters(p=>({...p,[key]:e.target.value}))}
              className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-[#4a5070]" />
          </div>
        ))}
        <div className="flex-1 min-w-28">
          <label className="text-xs text-[#7b82a8] mb-1 block">Gender</label>
          <select value={filters.gender} onChange={(e)=>setFilters(p=>({...p,gender:e.target.value}))}
            className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-3 py-2 text-sm text-white">
            <option value="">Any</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <button onClick={fetchProperties} className="bg-brand-500 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-brand-600 transition-colors">Search</button>
      </div>

      {/* Category winners */}
      {Object.keys(winners).length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { key:'closest',   label:'📍 Closest'    },
            { key:'cheapest',  label:'💸 Cheapest'   },
            { key:'bestRated', label:'⭐ Best Rated'  },
            { key:'bestValue', label:'🏆 Best Value'  },
          ].map(({ key, label }) => winners[key] && (
            <div key={key} className="bg-[#111527] border border-brand-500/20 rounded-xl p-3 text-sm">
              <div className="text-[#7b82a8] text-xs mb-1">{label}</div>
              <div className="text-white font-semibold truncate">{winners[key].name}</div>
              <div className="text-brand-400 text-xs">{(winners[key].current_price/100).toLocaleString('en-IN')}/mo</div>
            </div>
          ))}
        </div>
      )}

      {/* View toggle */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-[#7b82a8] text-sm">{loading ? 'Searching...' : `${properties.length} properties found`}</div>
        <div className="flex bg-[#111527] border border-white/5 rounded-xl p-1 gap-1">
          {['grid','map'].map((v) => (
            <button key={v} onClick={()=>setView(v)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view===v?'bg-brand-500 text-white':'text-[#7b82a8] hover:text-white'}`}>
              {v === 'grid' ? '⊞ Grid' : '🗺️ Map'}
            </button>
          ))}
        </div>
      </div>

      {view === 'map' ? (
        <PropertyMap properties={properties} collegeLat={collegeLat} collegeLng={collegeLng} height="500px" />
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_,i) => (
            <div key={i} className="bg-[#111527] rounded-2xl overflow-hidden">
              <div className="shimmer h-48" />
              <div className="p-5 space-y-3">
                <div className="shimmer h-5 rounded w-3/4" />
                <div className="shimmer h-4 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : properties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p) => <PropertyCard key={p.id} property={p} showScore />)}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
          <div className="text-white font-semibold mb-2">No properties found</div>
          <div className="text-[#7b82a8]">Try adjusting your filters</div>
        </div>
      )}
    </div>
  )
}