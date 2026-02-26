'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const STATUS_COLORS = { open:'badge-warning', under_review:'badge-info', resolved:'badge-success', escalated:'badge-danger' }

export default function OwnerDisputesPage() {
  const { user } = useUser()
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [resolveForm, setResolveForm] = useState({ id:null, note:'' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    const { data: owner } = await supabase.from('users').select('id').eq('clerk_id', user.id).single()
    if (!owner) { setLoading(false); return }
    const { data: props } = await supabase.from('properties').select('id').eq('owner_id', owner.id)
    if (!props?.length) { setLoading(false); return }
    const { data } = await supabase
      .from('disputes')
      .select('*, properties(name), users!raised_by(full_name,email)')
      .in('property_id', props.map(p=>p.id))
      .order('created_at', { ascending: false })
    setDisputes(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    const { error } = await supabase.from('disputes').update({ status }).eq('id', id)
    if (error) return toast.error('Failed to update')
    toast.success(`Marked as ${status.replace('_',' ')}`)
    fetchData()
  }

  async function handleResolve(e) {
    e.preventDefault()
    if (!resolveForm.note.trim()) return toast.error('Resolution note required')
    setSubmitting(true)
    const { error } = await supabase.from('disputes').update({ status:'resolved', resolution_note:resolveForm.note }).eq('id', resolveForm.id)
    if (error) { toast.error('Failed'); setSubmitting(false); return }
    toast.success('Dispute resolved!')
    setResolveForm({ id:null, note:'' })
    fetchData()
    setSubmitting(false)
  }

  const filtered = filter === 'all' ? disputes : disputes.filter(d=>d.status===filter)
  const stats = { open:0, under_review:0, resolved:0, escalated:0 }
  disputes.forEach(d=>{ if(stats[d.status]!==undefined) stats[d.status]++ })

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">Disputes & Complaints</h1>
        <p className="text-[#7b82a8]">Maintenance requests, billing disputes, and complaints from tenants</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[['Open',stats.open,'#f5a623','🔔'],['Under Review',stats.under_review,'#4f6ef7','🔍'],['Resolved',stats.resolved,'#06d6a0','✅'],['Escalated',stats.escalated,'#ff4d6d','🚨']].map(([l,v,c,i])=>(
          <div key={l} className="bg-[#111527] border border-white/5 rounded-2xl p-5">
            <div className="text-2xl mb-2">{i}</div>
            <div className="font-syne font-bold text-2xl" style={{color:c}}>{v}</div>
            <div className="text-[#7b82a8] text-sm">{l}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {['all','open','under_review','resolved','escalated'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${filter===f?'bg-brand-500 text-white':'bg-[#111527] text-[#7b82a8] border border-white/5 hover:text-white'}`}>
            {f.replace('_',' ')} ({f==='all'?disputes.length:stats[f]||0})
          </button>
        ))}
      </div>

      {resolveForm.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111527] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="font-syne font-bold text-xl text-white mb-4">Mark as Resolved</h2>
            <form onSubmit={handleResolve} className="space-y-4">
              <div>
                <label className="text-xs text-[#7b82a8] mb-2 block">Resolution Note *</label>
                <textarea value={resolveForm.note} onChange={e=>setResolveForm(p=>({...p,note:e.target.value}))} rows={4}
                  placeholder="Describe what action was taken to fix this issue..."
                  className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070] resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="flex-1 bg-accent-green text-[#0d1117] font-semibold py-2.5 rounded-xl disabled:opacity-50">
                  {submitting ? '...' : '✅ Resolve'}
                </button>
                <button type="button" onClick={()=>setResolveForm({id:null,note:''})} className="flex-1 bg-white/5 text-white font-semibold py-2.5 rounded-xl">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div className="space-y-4">{[...Array(3)].map((_,i)=><div key={i} className="shimmer h-28 rounded-2xl"/>)}</div>
      : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(d=>(
            <div key={d.id} className={`bg-[#111527] border rounded-2xl overflow-hidden transition-all ${expanded===d.id?'border-brand-500/30':'border-white/5 hover:border-white/10'}`}>
              <div className="p-5 cursor-pointer" onClick={()=>setExpanded(expanded===d.id?null:d.id)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h3 className="font-semibold text-white">{d.title}</h3>
                      <span className={`${STATUS_COLORS[d.status]||'badge-muted'} text-xs px-2 py-0.5 rounded-full capitalize`}>{d.status?.replace('_',' ')}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-[#7b82a8] flex-wrap">
                      <span>👤 {d.users?.full_name||'Unknown'}</span>
                      {d.properties?.name && <span>🏢 {d.properties.name}</span>}
                      <span>📅 {formatDate(d.created_at)}</span>
                    </div>
                  </div>
                  <span className={`text-brand-400 text-lg transition-transform flex-shrink-0 ${expanded===d.id?'rotate-180':''}`}>▾</span>
                </div>
                <p className="text-[#7b82a8] text-sm mt-2 line-clamp-2">{d.description}</p>
              </div>
              {expanded === d.id && (
                <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
                  <div className="bg-[#0b0f1e] rounded-xl p-4">
                    <div className="text-xs text-[#7b82a8] uppercase tracking-widest mb-2">Full Description</div>
                    <p className="text-white/90 text-sm leading-relaxed">{d.description}</p>
                  </div>
                  {d.resolution_note && (
                    <div className="bg-accent-green/10 border border-accent-green/20 rounded-xl p-4">
                      <div className="text-xs text-accent-green uppercase tracking-widest mb-1">Resolution</div>
                      <p className="text-white/90 text-sm">{d.resolution_note}</p>
                    </div>
                  )}
                  {d.status !== 'resolved' && (
                    <div className="flex gap-2 flex-wrap">
                      {d.status === 'open' && (
                        <button onClick={()=>updateStatus(d.id,'under_review')} className="badge-info text-xs px-4 py-2 rounded-lg font-semibold cursor-pointer hover:opacity-80">🔍 Mark Under Review</button>
                      )}
                      <button onClick={()=>setResolveForm({id:d.id,note:''})} className="badge-success text-xs px-4 py-2 rounded-lg font-semibold cursor-pointer hover:opacity-80">✅ Mark Resolved</button>
                      <button onClick={()=>updateStatus(d.id,'escalated')} className="badge-danger text-xs px-4 py-2 rounded-lg font-semibold cursor-pointer hover:opacity-80">🚨 Escalate to Admin</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-[#111527] border border-white/5 rounded-2xl">
          <div className="text-5xl mb-4">⚖️</div>
          <div className="text-white font-semibold mb-2">{filter==='all'?'No disputes yet':`No ${filter.replace('_',' ')} disputes`}</div>
          <div className="text-[#7b82a8]">{filter==='all'?'Disputes raised by your tenants appear here':'Try a different filter'}</div>
        </div>
      )}
    </div>
  )
}