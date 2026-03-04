'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

const ROLE_COLORS = {
  student: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
  owner:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
  admin:   'bg-red-500/10 text-red-400 border-red-500/20',
}

export default function AdminUsersPage() {
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('all')
  const [search, setSearch]         = useState('')
  const [expanded, setExpanded]     = useState(null)
  const [userDetails, setUserDetails] = useState({})
  const [loadingDetail, setLoadingDetail] = useState(null)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    // Simple select — no joins, avoids 400 errors
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, created_at')
      .order('created_at', { ascending: false })
    if (error) console.error('Users fetch error:', error)
    setUsers(data || [])
    setLoading(false)
  }

  async function fetchUserDetails(user) {
    if (userDetails[user.id]) return
    setLoadingDetail(user.id)

    let details = {}
    try {
      if (user.role === 'student') {
        const [{ data: enrollments }, { data: invoices }, { data: disputes }] = await Promise.all([
          supabase.from('enrollments').select('id, status, monthly_rent, property_id').eq('student_id', user.id).limit(10),
          supabase.from('invoices').select('id, status, total_amount').eq('student_id', user.id).limit(20),
          supabase.from('disputes').select('id, status').eq('raised_by', user.id),
        ])

        // Fetch property names separately
        const propIds = [...new Set((enrollments || []).map(e => e.property_id).filter(Boolean))]
        let propNames = {}
        if (propIds.length > 0) {
          const { data: props } = await supabase.from('properties').select('id, name').in('id', propIds)
          propNames = Object.fromEntries((props || []).map(p => [p.id, p.name]))
        }

        details = {
          enrollments: (enrollments || []).map(e => ({ ...e, property_name: propNames[e.property_id] || '—' })),
          invoices: invoices || [],
          disputes: disputes || [],
        }
      } else if (user.role === 'owner') {
        const { data: properties } = await supabase
          .from('properties')
          .select('id, name, status, city')
          .eq('owner_id', user.id)
        details = { properties: properties || [] }
      }
    } catch (err) {
      console.error('Detail fetch error:', err)
    }

    setUserDetails(prev => ({ ...prev, [user.id]: details }))
    setLoadingDetail(null)
  }

  function toggleExpand(user) {
    if (expanded === user.id) { setExpanded(null); return }
    setExpanded(user.id)
    fetchUserDetails(user)
  }

  const filtered = users
    .filter(u => filter === 'all' || u.role === filter)
    .filter(u => !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()))

  const counts = { all: users.length, student: 0, owner: 0, admin: 0 }
  users.forEach(u => { if (counts[u.role] !== undefined) counts[u.role]++ })

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="mb-6">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">Users</h1>
        <p className="text-[#7b82a8]">All registered users on the platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total',    value: counts.all,     color: '#4f6ef7', icon: '👥' },
          { label: 'Students', value: counts.student,  color: '#06d6a0', icon: '🎓' },
          { label: 'Owners',   value: counts.owner,    color: '#7c3aed', icon: '🏢' },
          { label: 'Admins',   value: counts.admin,    color: '#f5a623', icon: '⚙️' },
        ].map(s => (
          <div key={s.label} className="bg-[#111527] border border-white/5 rounded-2xl p-4">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="font-syne font-bold text-2xl" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[#7b82a8] text-sm">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['all', 'student', 'owner', 'admin'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${filter === f ? 'bg-brand-500 text-white' : 'bg-[#111527] text-[#7b82a8] hover:text-white border border-white/5'}`}>
            {f} <span className="opacity-60">({counts[f]})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or email..."
        className="w-full mb-6 bg-[#111527] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#7b82a8] focus:outline-none focus:border-brand-500" />

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="shimmer h-16 rounded-xl" />)}</div>
      ) : (
        <div className="bg-[#111527] border border-white/5 rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-[#7b82a8]">No users found</div>
          ) : filtered.map((user, idx) => {
            const details = userDetails[user.id]
            const isOpen  = expanded === user.id
            return (
              <div key={user.id} className={idx > 0 ? 'border-t border-white/5' : ''}>
                <button onClick={() => toggleExpand(user)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-brand-500/20 flex items-center justify-center text-sm font-bold text-brand-400 flex-shrink-0">
                      {user.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-medium truncate">{user.full_name}</div>
                      <div className="text-[#7b82a8] text-xs truncate">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${ROLE_COLORS[user.role] || ''}`}>{user.role}</span>
                    <span className="text-xs text-[#4a5070] hidden sm:block">{formatDate(user.created_at)}</span>
                    <span className="text-[#7b82a8] text-xs">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-white/5 px-5 pb-5 pt-4">
                    {loadingDetail === user.id ? (
                      <div className="text-[#7b82a8] text-sm">Loading...</div>
                    ) : !details ? (
                      <div className="text-[#7b82a8] text-sm">No details available</div>
                    ) : user.role === 'student' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-[#0b0f1e] rounded-xl p-4">
                          <div className="text-xs text-[#7b82a8] uppercase tracking-widest mb-2">Enrollments ({details.enrollments?.length || 0})</div>
                          {details.enrollments?.length > 0 ? details.enrollments.slice(0, 3).map((e, i) => (
                            <div key={i} className="text-sm mb-1 flex justify-between">
                              <span className="text-white truncate">{e.property_name}</span>
                              <span className={`text-xs capitalize ml-2 ${e.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>{e.status}</span>
                            </div>
                          )) : <div className="text-[#7b82a8] text-sm">None</div>}
                        </div>
                        <div className="bg-[#0b0f1e] rounded-xl p-4">
                          <div className="text-xs text-[#7b82a8] uppercase tracking-widest mb-2">Invoices ({details.invoices?.length || 0})</div>
                          {['paid', 'pending', 'overdue'].map(s => {
                            const n = details.invoices?.filter(i => i.status === s).length || 0
                            return n > 0 ? (
                              <div key={s} className="flex justify-between text-sm mb-1">
                                <span className="text-[#7b82a8] capitalize">{s}</span>
                                <span className={s === 'paid' ? 'text-green-400' : s === 'overdue' ? 'text-red-400' : 'text-yellow-400'}>{n}</span>
                              </div>
                            ) : null
                          })}
                          {!details.invoices?.length && <div className="text-[#7b82a8] text-sm">None</div>}
                        </div>
                        <div className="bg-[#0b0f1e] rounded-xl p-4">
                          <div className="text-xs text-[#7b82a8] uppercase tracking-widest mb-2">Disputes</div>
                          <div className="font-syne font-bold text-2xl text-white">{details.disputes?.length || 0}</div>
                          <div className="text-[#7b82a8] text-xs">total raised</div>
                        </div>
                      </div>
                    ) : user.role === 'owner' ? (
                      <div className="bg-[#0b0f1e] rounded-xl p-4">
                        <div className="text-xs text-[#7b82a8] uppercase tracking-widest mb-2">Properties ({details.properties?.length || 0})</div>
                        {details.properties?.length > 0 ? details.properties.map(p => (
                          <div key={p.id} className="flex justify-between text-sm mb-1">
                            <span className="text-white">{p.name} — {p.city}</span>
                            <span className={`text-xs capitalize ${p.status === 'approved' ? 'text-green-400' : p.status === 'pending' ? 'text-yellow-400' : 'text-red-400'}`}>{p.status}</span>
                          </div>
                        )) : <div className="text-[#7b82a8] text-sm">No properties</div>}
                      </div>
                    ) : (
                      <div className="text-[#7b82a8] text-sm">Admin account — full platform access</div>
                    )}
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