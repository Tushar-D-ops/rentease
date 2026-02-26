'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'

const PropertyMap = dynamic(() => import('@/components/maps/PropertyMap'), { ssr: false })

const AMENITY_OPTIONS = ['wifi','ac','geyser','laundry','meals','parking','security','cctv','gym','power_backup','study_room','housekeeping']

export default function OwnerPropertiesPage() {
  const { user } = useUser()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedProp, setSelectedProp] = useState(null)
  const [showRoomForm, setShowRoomForm] = useState(false)
  const [view, setView] = useState('list')
  const [form, setForm] = useState({
    name:'', description:'', address:'', city:'',
    lat:'', lng:'', base_price:'',
    gender_restriction:'any', amenities:[], dynamic_pricing_enabled:false,
  })
  const [roomForm, setRoomForm] = useState({ room_number:'', capacity:1, room_type:'single', floor_number:'', extra_price:0 })

  useEffect(() => { if (user) fetchProperties() }, [user])

  async function fetchProperties() {
    console.log(user)
    const { data: owner } = await supabase.from('users').select('id').eq('clerk_id', user.id).single()
    if (!owner) { setLoading(false); return }
    const { data } = await supabase
      .from('properties')
      .select('*, rooms(id,room_number,capacity,occupied,room_type,status,floor_number)')
      .eq('owner_id', owner.id)
      .order('created_at', { ascending: false })
    setProperties(data || [])
    setLoading(false)
  }

  async function handleAddProperty(e) {
    e.preventDefault()
    if (!form.name || !form.address || !form.city || !form.lat || !form.lng || !form.base_price)
      return toast.error('Please fill all required fields')
    setSubmitting(true)
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, base_price: parseFloat(form.base_price) }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      toast.success('Property submitted for approval!')
      setShowForm(false)
      setForm({ name:'',description:'',address:'',city:'',lat:'',lng:'',base_price:'',gender_restriction:'any',amenities:[],dynamic_pricing_enabled:false })
      fetchProperties()
    } catch (err) { toast.error(err.message) }
    finally { setSubmitting(false) }
  }

  async function handleAddRoom(e) {
    e.preventDefault()
    if (!selectedProp || !roomForm.room_number) return toast.error('Room number required')
    setSubmitting(true)
    try {
      const { error } = await supabase.from('rooms').insert({
        property_id: selectedProp.id,
        room_number: roomForm.room_number,
        capacity: parseInt(roomForm.capacity),
        room_type: roomForm.room_type,
        floor_number: roomForm.floor_number ? parseInt(roomForm.floor_number) : null,
        extra_price: parseInt(roomForm.extra_price) * 100 || 0,
        status: 'available',
      })
      if (error) throw error
      toast.success('Room added!')
      setShowRoomForm(false)
      setRoomForm({ room_number:'', capacity:1, room_type:'single', floor_number:'', extra_price:0 })
      fetchProperties()
    } catch (err) { toast.error(err.message) }
    finally { setSubmitting(false) }
  }

  function toggleAmenity(a) {
    setForm(p => ({ ...p, amenities: p.amenities.includes(a) ? p.amenities.filter(x=>x!==a) : [...p.amenities, a] }))
  }

  const STATUS_COLORS = { pending:'badge-warning', approved:'badge-success', rejected:'badge-danger', suspended:'badge-danger' }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-syne font-bold text-3xl text-white mb-1">My Properties</h1>
          <p className="text-[#7b82a8]">Manage your PGs, messes, and accommodations</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90">
          + Add Property
        </button>
      </div>

      {showForm && (
        <div className="bg-[#111527] border border-brand-500/20 rounded-2xl p-6 mb-8">
          <h2 className="font-syne font-bold text-xl text-white mb-6">List New Property</h2>
          <form onSubmit={handleAddProperty} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[['name','Property Name *','e.g. Sunrise PG for Boys'],['city','City *','e.g. Pune, Nagpur']].map(([k,l,p])=>(
                <div key={k}>
                  <label className="text-xs text-[#7b82a8] mb-2 block">{l}</label>
                  <input value={form[k]} onChange={e=>setForm(prev=>({...prev,[k]:e.target.value}))} placeholder={p}
                    className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070]" />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="text-xs text-[#7b82a8] mb-2 block">Full Address *</label>
                <input value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} placeholder="Street, Area, City, Pincode"
                  className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070]" />
              </div>
              <div>
                <label className="text-xs text-[#7b82a8] mb-2 block">Latitude * <span className="text-[#4a5070]">(right-click on Google Maps → copy coords)</span></label>
                <input type="number" step="any" value={form.lat} onChange={e=>setForm(p=>({...p,lat:e.target.value}))} placeholder="e.g. 18.5204"
                  className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070]" />
              </div>
              <div>
                <label className="text-xs text-[#7b82a8] mb-2 block">Longitude *</label>
                <input type="number" step="any" value={form.lng} onChange={e=>setForm(p=>({...p,lng:e.target.value}))} placeholder="e.g. 73.8567"
                  className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070]" />
              </div>
              <div>
                <label className="text-xs text-[#7b82a8] mb-2 block">Base Rent (₹/month) *</label>
                <input type="number" value={form.base_price} onChange={e=>setForm(p=>({...p,base_price:e.target.value}))} placeholder="e.g. 8000"
                  className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070]" />
              </div>
              <div>
                <label className="text-xs text-[#7b82a8] mb-2 block">Gender Restriction</label>
                <select value={form.gender_restriction} onChange={e=>setForm(p=>({...p,gender_restriction:e.target.value}))}
                  className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white">
                  <option value="any">Any (Co-ed)</option>
                  <option value="male">Male Only</option>
                  <option value="female">Female Only</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-[#7b82a8] mb-2 block">Description</label>
              <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={3}
                placeholder="Describe your property — location highlights, rules, nearby landmarks..."
                className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070] resize-none" />
            </div>
            <div>
              <label className="text-xs text-[#7b82a8] mb-3 block">Amenities</label>
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map(a=>(
                  <button type="button" key={a} onClick={()=>toggleAmenity(a)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${form.amenities.includes(a)?'bg-brand-500 text-white':'bg-white/5 text-[#7b82a8] hover:text-white border border-white/10'}`}>
                    {a.replace('_',' ')}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={()=>setForm(p=>({...p,dynamic_pricing_enabled:!p.dynamic_pricing_enabled}))}
                className={`w-10 h-5 rounded-full transition-colors relative ${form.dynamic_pricing_enabled?'bg-brand-500':'bg-white/10'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.dynamic_pricing_enabled?'translate-x-5':'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-white">Enable Dynamic Pricing <span className="text-[#7b82a8]">(auto-adjusts rent based on occupancy)</span></span>
            </label>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 disabled:opacity-50">
                {submitting ? '⏳ Submitting...' : 'Submit for Approval'}
              </button>
              <button type="button" onClick={()=>setShowForm(false)} className="bg-white/5 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {showRoomForm && selectedProp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111527] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="font-syne font-bold text-xl text-white mb-1">Add Room</h2>
            <p className="text-[#7b82a8] text-sm mb-5">to {selectedProp.name}</p>
            <form onSubmit={handleAddRoom} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#7b82a8] mb-1 block">Room Number *</label>
                  <input value={roomForm.room_number} onChange={e=>setRoomForm(p=>({...p,room_number:e.target.value}))} placeholder="101, A1"
                    className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
                </div>
                <div>
                  <label className="text-xs text-[#7b82a8] mb-1 block">Capacity</label>
                  <input type="number" min="1" max="10" value={roomForm.capacity} onChange={e=>setRoomForm(p=>({...p,capacity:e.target.value}))}
                    className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
                </div>
                <div>
                  <label className="text-xs text-[#7b82a8] mb-1 block">Type</label>
                  <select value={roomForm.room_type} onChange={e=>setRoomForm(p=>({...p,room_type:e.target.value}))}
                    className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
                    {['single','double','triple','dormitory'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#7b82a8] mb-1 block">Floor (0=Ground)</label>
                  <input type="number" value={roomForm.floor_number} onChange={e=>setRoomForm(p=>({...p,floor_number:e.target.value}))}
                    className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-[#7b82a8] mb-1 block">Extra Charge ₹/month (above base)</label>
                  <input type="number" value={roomForm.extra_price} onChange={e=>setRoomForm(p=>({...p,extra_price:e.target.value}))} placeholder="0"
                    className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="flex-1 bg-brand-500 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50">
                  {submitting ? '...' : 'Add Room'}
                </button>
                <button type="button" onClick={()=>{setShowRoomForm(false);setSelectedProp(null)}} className="flex-1 bg-white/5 text-white font-semibold py-2.5 rounded-xl">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="text-[#7b82a8] text-sm">{properties.length} properties listed</div>
        <div className="flex bg-[#111527] border border-white/5 rounded-xl p-1 gap-1">
          {['list','map'].map(v=>(
            <button key={v} onClick={()=>setView(v)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view===v?'bg-brand-500 text-white':'text-[#7b82a8] hover:text-white'}`}>
              {v==='list'?'☰ List':'🗺️ Map'}
            </button>
          ))}
        </div>
      </div>

      {view === 'map' ? (
        <PropertyMap properties={properties} height="500px" />
      ) : loading ? (
        <div className="space-y-4">{[...Array(3)].map((_,i)=><div key={i} className="shimmer h-48 rounded-2xl"/>)}</div>
      ) : properties.length === 0 ? (
        <div className="text-center py-20 bg-[#111527] border border-white/5 rounded-2xl">
          <div className="text-5xl mb-4">🏢</div>
          <div className="text-white font-semibold mb-2">No properties yet</div>
          <button onClick={()=>setShowForm(true)} className="mt-4 bg-brand-500 text-white font-semibold px-6 py-3 rounded-xl">Add Property</button>
        </div>
      ) : (
        <div className="space-y-6">
          {properties.map(prop => {
            const total = prop.rooms?.length || 0
            const available = prop.rooms?.filter(r=>r.status==='available').length || 0
            const filled = prop.rooms?.filter(r=>r.status==='filled').length || 0
            const occ = total ? Math.round((filled/total)*100) : 0
            return (
              <div key={prop.id} className="bg-[#111527] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all">
                <div className="p-6 border-b border-white/5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <h3 className="font-syne font-bold text-xl text-white">{prop.name}</h3>
                        <span className={`${STATUS_COLORS[prop.status]||'badge-muted'} text-xs px-2 py-0.5 rounded-full capitalize`}>{prop.status}</span>
                        {prop.gender_restriction!=='any' && <span className="badge-info text-xs px-2 py-0.5 rounded-full capitalize">{prop.gender_restriction==='male'?'👨 Male':'👩 Female'}</span>}
                      </div>
                      <p className="text-[#7b82a8] text-sm">📍 {prop.address}, {prop.city}</p>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <div className="font-syne font-bold text-xl text-brand-400">{formatCurrency(prop.current_price)}<span className="text-[#7b82a8] font-normal text-sm">/mo</span></div>
                      {prop.dynamic_pricing_enabled && <div className="text-xs text-accent-green mt-1">🔄 Dynamic ON</div>}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 mt-4">
                    {[['Total',total,'#fff'],['Available',available,'#06d6a0'],['Occupied',filled,'#4f6ef7'],['Occupancy',`${occ}%`,occ>80?'#ff4d6d':occ>50?'#f5a623':'#06d6a0']].map(([l,v,c])=>(
                      <div key={l} className="bg-[#0b0f1e] rounded-xl p-3 text-center">
                        <div className="font-syne font-bold text-lg" style={{color:c}}>{v}</div>
                        <div className="text-[#7b82a8] text-xs">{l}</div>
                      </div>
                    ))}
                  </div>
                  {prop.amenities?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {prop.amenities.map(a=><span key={a} className="bg-white/5 text-[#7b82a8] text-xs px-2 py-0.5 rounded-md capitalize">{a.replace('_',' ')}</span>)}
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button onClick={()=>{setSelectedProp(prop);setShowRoomForm(true)}} className="bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 text-xs font-semibold px-4 py-2 rounded-lg">+ Add Room</button>
                    {prop.status==='pending' && <span className="text-xs text-accent-gold bg-accent-gold/10 px-3 py-2 rounded-lg">⏳ Pending admin approval</span>}
                  </div>
                </div>
                {prop.rooms?.length > 0 && (
                  <div className="p-4">
                    <div className="text-xs text-[#7b82a8] uppercase tracking-widest mb-3">Rooms</div>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      {prop.rooms.map(r=>(
                        <div key={r.id} className={`p-3 rounded-xl border text-center ${r.status==='filled'?'bg-brand-500/10 border-brand-500/30':r.status==='available'?'bg-accent-green/5 border-accent-green/20':'bg-white/5 border-white/10'}`}>
                          <div className="font-bold text-white text-sm">#{r.room_number}</div>
                          <div className="text-[#7b82a8] text-xs capitalize">{r.room_type}</div>
                          <div className="text-[#7b82a8] text-xs">{r.occupied||0}/{r.capacity}</div>
                          <div className={`text-xs font-semibold mt-1 capitalize ${r.status==='filled'?'text-brand-400':r.status==='available'?'text-accent-green':'text-[#7b82a8]'}`}>{r.status}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}