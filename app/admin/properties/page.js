'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  pending:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  suspended:'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('all')
  const [expanded, setExpanded]     = useState(null)
  const [processing, setProcessing] = useState(null)
  const [search, setSearch]         = useState('')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data } = await supabase
      .from('properties')
      .select('*, users!owner_id(full_name, email), rooms(id, room_number, room_type, capacity, status, extra_price)')
      .order('created_at', { ascending: false })
    setProperties(data || [])
    setLoading(false)
  }

  async function handleAction(id, action) {
    setProcessing(id + action)
    if (action === 'reject' && !confirm('Reject this property? The owner will be notified.')) {
      setProcessing(null)
      return
    }
    const update = action === 'approve'
      ? { status: 'approved', approved_at: new Date().toISOString() }
      : action === 'reject'
      ? { status: 'rejected' }
      : { status: 'suspended' }

    const { error } = await supabase.from('properties').update(update).eq('id', id)
    if (error) toast.error('Action failed')
    else toast.success(`Property ${action}d!`)
    setProcessing(null)
    fetchData()
  }

  const filtered = properties
    .filter(p => filter === 'all' || p.status === filter)
    .filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.city?.toLowerCase().includes(search.toLowerCase()) || p.users?.full_name?.toLowerCase().includes(search.toLowerCase()))

  const counts = { all: properties.length, pending: 0, approved: 0, rejected: 0, suspended: 0 }
  properties.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++ })

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="mb-6">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">Properties</h1>
        <p className="text-[#7b82a8]">Review, approve, and manage all listed properties</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['all','pending','approved','rejected','suspended'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${filter === f ? 'bg-brand-500 text-white' : 'bg-[#111527] text-[#7b82a8] hover:text-white border border-white/5'}`}>
            {f} {counts[f] > 0 && <span className="ml-1 opacity-60">({counts[f]})</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, city, or owner..."
        className="w-full mb-6 bg-[#111527] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#7b82a8] focus:outline-none focus:border-brand-500" />

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="shimmer h-32 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#7b82a8]">No properties found</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(prop => (
            <div key={prop.id} className="bg-[#111527] border border-white/5 rounded-2xl overflow-hidden">
              {/* Property Header */}
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-syne font-bold text-white text-lg truncate">{prop.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize flex-shrink-0 ${STATUS_COLORS[prop.status]}`}>
                      {prop.status}
                    </span>
                  </div>
                  <div className="text-sm text-[#7b82a8]">
                    📍 {prop.city} · 👤 {prop.users?.full_name} ({prop.users?.email}) · 🏠 {prop.rooms?.length || 0} rooms · 💰 {formatCurrency(prop.base_price || prop.current_price)}/mo
                  </div>
                  <div className="text-xs text-[#4a5070] mt-1">Listed {formatDate(prop.created_at)}</div>
                </div>

                <div className="flex flex-wrap gap-2 flex-shrink-0">
                  <button onClick={() => setExpanded(expanded === prop.id ? null : prop.id)}
                    className="text-xs bg-white/5 text-[#7b82a8] hover:text-white px-3 py-1.5 rounded-lg border border-white/5">
                    {expanded === prop.id ? 'Hide Rooms ▲' : `View Rooms (${prop.rooms?.length || 0}) ▼`}
                  </button>
                  {prop.status === 'pending' && (
                    <>
                      <button onClick={() => handleAction(prop.id, 'approve')} disabled={!!processing}
                        className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50">
                        {processing === prop.id + 'approve' ? '...' : '✓ Approve'}
                      </button>
                      <button onClick={() => handleAction(prop.id, 'reject')} disabled={!!processing}
                        className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50">
                        {processing === prop.id + 'reject' ? '...' : '✗ Reject'}
                      </button>
                    </>
                  )}
                  {prop.status === 'approved' && (
                    <button onClick={() => handleAction(prop.id, 'suspend')} disabled={!!processing}
                      className="text-xs bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 px-3 py-1.5 rounded-lg font-semibold">
                      ⏸ Suspend
                    </button>
                  )}
                  {(prop.status === 'rejected' || prop.status === 'suspended') && (
                    <button onClick={() => handleAction(prop.id, 'approve')} disabled={!!processing}
                      className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-1.5 rounded-lg font-semibold">
                      ↩ Re-approve
                    </button>
                  )}
                </div>
              </div>

              {/* Amenities */}
              {prop.amenities?.length > 0 && (
                <div className="px-5 pb-3 flex flex-wrap gap-1">
                  {prop.amenities.map(a => (
                    <span key={a} className="bg-white/5 text-[#7b82a8] text-xs px-2 py-0.5 rounded-md capitalize">{a.replace('_', ' ')}</span>
                  ))}
                </div>
              )}

              {/* Rooms Expanded */}
              {expanded === prop.id && (
                <div className="border-t border-white/5 p-5">
                  <div className="text-xs text-[#7b82a8] uppercase tracking-widest mb-3">Room Details</div>
                  {prop.rooms?.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {prop.rooms.map(r => (
                        <div key={r.id} className={`p-3 rounded-xl border text-center ${
                          r.status === 'filled'     ? 'bg-brand-500/10 border-brand-500/30' :
                          r.status === 'available'  ? 'bg-green-500/5 border-green-500/20' :
                          'bg-white/5 border-white/10'}`}>
                          <div className="font-bold text-white">#{r.room_number}</div>
                          <div className="text-[#7b82a8] text-xs capitalize">{r.room_type}</div>
                          <div className="text-[#7b82a8] text-xs">Cap: {r.capacity}</div>
                          {r.extra_price > 0 && <div className="text-brand-400 text-xs">+{formatCurrency(r.extra_price)}</div>}
                          <div className={`text-xs font-semibold mt-1 capitalize ${
                            r.status === 'filled' ? 'text-brand-400' :
                            r.status === 'available' ? 'text-green-400' : 'text-[#7b82a8]'}`}>
                            {r.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[#7b82a8] text-sm">No rooms added yet</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}