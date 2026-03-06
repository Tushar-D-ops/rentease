'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  open:         'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  under_review: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  resolved:     'bg-green-500/10 text-green-400 border-green-500/20',
  escalated:    'bg-red-500/10 text-red-400 border-red-500/20',
}
// const STATUS_ICONS = { open: '🔔', under_review: '🔍', resolved: '✅', escalated: '🚨' }

export default function AdminDisputesPage() {
  const [disputes, setDisputes]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState('all')
  const [expanded, setExpanded]       = useState(null)
  const [resolveForm, setResolveForm] = useState({ id: null, note: '' })
  const [submitting, setSubmitting]   = useState(false)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: rawDisputes, error } = await supabase
      .from('disputes')
      .select('id, title, description, status, created_at, resolution_note, property_id, raised_by')
      .order('created_at', { ascending: false })

    if (error) { console.error('Disputes error:', error); setLoading(false); return }

    const disputes = rawDisputes || []
    const propIds  = [...new Set(disputes.map(d => d.property_id).filter(Boolean))]
    const userIds  = [...new Set(disputes.map(d => d.raised_by).filter(Boolean))]

    const [{ data: props }, { data: users }] = await Promise.all([
      propIds.length > 0 ? supabase.from('properties').select('id, name, city').in('id', propIds) : Promise.resolve({ data: [] }),
      userIds.length > 0 ? supabase.from('users').select('id, full_name, email').in('id', userIds) : Promise.resolve({ data: [] }),
    ])

    const propMap = Object.fromEntries((props || []).map(p => [p.id, p]))
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u]))

    setDisputes(disputes.map(d => ({ ...d, property: propMap[d.property_id], raisedBy: userMap[d.raised_by] })))
    setLoading(false)
  }

  async function updateStatus(id, status) {
    const { error } = await supabase.from('disputes').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return toast.error('Failed to update')
    toast.success(`Marked as ${status.replace('_', ' ')}`)
    fetchData()
  }

  async function handleResolve(e) {
    e.preventDefault()
    if (!resolveForm.note.trim()) return toast.error('Resolution note required')
    setSubmitting(true)
    const { error } = await supabase.from('disputes').update({
      status: 'resolved',
      resolution_note: resolveForm.note.trim(),
      updated_at: new Date().toISOString(),
    }).eq('id', resolveForm.id)
    if (error) { toast.error('Failed to resolve'); setSubmitting(false); return }
    toast.success('Dispute resolved!')
    setResolveForm({ id: null, note: '' })
    setExpanded(null)
    fetchData()
    setSubmitting(false)
  }

  const filtered = filter === 'all' ? disputes : disputes.filter(d => d.status === filter)
  const counts   = { all: disputes.length, open: 0, under_review: 0, escalated: 0, resolved: 0 }
  disputes.forEach(d => { if (counts[d.status] !== undefined) counts[d.status]++ })

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="mb-6">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">Disputes</h1>
        <p className="text-[#7b82a8]">View all disputes — resolve escalated ones</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          [ 'Escalated',    counts.escalated,    '#ff4d6d'],
          [ 'Open',         counts.open,         '#f5a623'],
          [ 'Under Review', counts.under_review, '#4f6ef7'],
          [ 'Resolved',     counts.resolved,     '#06d6a0'],
        ].map(([label, value, color]) => (
          <div key={label} className="bg-[#111527] border border-white/5 rounded-2xl p-4 cursor-pointer hover:border-white/10 transition-all"
            onClick={() => setFilter(label.toLowerCase().replace(' ', '_'))}>
            {/* <div className="text-2xl mb-1">{icon}</div> */}
            <div className="font-syne font-bold text-2xl" style={{ color }}>{value}</div>
            <div className="text-[#7b82a8] text-sm">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'all',         label: `All (${counts.all})` },
          { key: 'escalated',   label: `Escalated (${counts.escalated})` },
          { key: 'open',        label: `Open (${counts.open})` },
          { key: 'under_review',label: `Under Review (${counts.under_review})` },
          { key: 'resolved',    label: `Resolved (${counts.resolved})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f.key ? 'bg-brand-500 text-white' : 'bg-[#111527] text-[#7b82a8] hover:text-white border border-white/5'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="shimmer h-24 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-[#111527] border border-white/5 rounded-2xl text-[#7b82a8]">
          No {filter === 'all' ? '' : filter.replace('_', ' ')} disputes
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => (
            <div key={d.id} className={`bg-[#111527] rounded-2xl overflow-hidden border ${d.status === 'escalated' ? 'border-red-500/20' : 'border-white/5'}`}>
              <button onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                className="w-full flex items-start justify-between p-5 text-left hover:bg-white/2 transition-colors">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    
                    <h3 className="font-semibold text-white">{d.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[d.status]}`}>
                      {d.status.replace('_', ' ')}
                    </span>
                    {/* Badge for non-escalated to show admin can't act */}
                    {d.status !== 'escalated' && d.status !== 'resolved' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-[#4a5070] border border-white/5">
                        owner handling
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-[#7b82a8] line-clamp-1">{d.description}</div>
                  <div className="text-xs text-[#4a5070] mt-1">
                    {d.raisedBy?.full_name} · {d.property?.name}, {d.property?.city} · {formatDate(d.created_at)}
                  </div>
                </div>
                <span className="text-[#7b82a8] flex-shrink-0">{expanded === d.id ? '▲' : '▼'}</span>
              </button>

              {expanded === d.id && (
                <div className="border-t border-white/5 p-5 space-y-4">
                  <div className="bg-[#0b0f1e] rounded-xl p-4">
                    <div className="text-xs text-[#7b82a8] uppercase tracking-widest mb-2">Description</div>
                    <p className="text-white/90 text-sm leading-relaxed">{d.description}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#0b0f1e] rounded-xl p-4">
                      <div className="text-xs text-[#7b82a8] uppercase tracking-widest mb-1">Raised By</div>
                      <div className="text-white text-sm">{d.raisedBy?.full_name}</div>
                      <div className="text-[#7b82a8] text-xs">{d.raisedBy?.email}</div>
                    </div>
                    <div className="bg-[#0b0f1e] rounded-xl p-4">
                      <div className="text-xs text-[#7b82a8] uppercase tracking-widest mb-1">Property</div>
                      <div className="text-white text-sm">{d.property?.name || '—'}</div>
                      <div className="text-[#7b82a8] text-xs">{d.property?.city}</div>
                    </div>
                  </div>

                  {d.resolution_note && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                      <div className="text-xs text-green-400 uppercase tracking-widest mb-1">Resolution Note</div>
                      <p className="text-white/90 text-sm">{d.resolution_note}</p>
                    </div>
                  )}

                  {/* ✅ Actions only for escalated disputes */}
                  {d.status === 'escalated' && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => updateStatus(d.id, 'under_review')}
                          className="text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-4 py-2 rounded-lg font-semibold">
                          🔍 Mark Under Review
                        </button>
                        <button onClick={() => setResolveForm({ id: d.id, note: '' })}
                          className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-4 py-2 rounded-lg font-semibold">
                          ✅ Resolve with Note
                        </button>
                      </div>

                      {resolveForm.id === d.id && (
                        <form onSubmit={handleResolve} className="space-y-3">
                          <textarea value={resolveForm.note} onChange={e => setResolveForm(p => ({ ...p, note: e.target.value }))}
                            placeholder="Write your resolution — visible to both student and owner..."
                            rows={3}
                            className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#7b82a8] focus:outline-none focus:border-brand-500 resize-none" />
                          <div className="flex gap-2">
                            <button type="submit" disabled={submitting}
                              className="bg-green-500/20 text-green-400 hover:bg-green-500/30 text-sm font-semibold px-5 py-2 rounded-xl disabled:opacity-50">
                              {submitting ? 'Saving...' : '✅ Confirm Resolution'}
                            </button>
                            <button type="button" onClick={() => setResolveForm({ id: null, note: '' })}
                              className="bg-white/5 text-[#7b82a8] hover:text-white text-sm px-5 py-2 rounded-xl">
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* Read-only note for non-escalated */}
                  {d.status !== 'escalated' && d.status !== 'resolved' && (
                    <div className="bg-brand-500/5 border border-brand-500/10 rounded-xl p-3 text-xs text-[#7b82a8]">
                      ℹ️ This dispute is being handled by the property owner. Admin action is only required for escalated disputes.
                    </div>
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