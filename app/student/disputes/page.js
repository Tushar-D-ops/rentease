'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import { formatDate, statusBadgeClass } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function StudentDisputesPage() {
  const { user } = useUser()
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', propertyId:'' })
  const [properties, setProperties] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
  const [disputes, { data: student }] = await Promise.all([
    fetch('/api/disputes').then(r => r.json()),
    supabase.from('users').select('id').eq('clerk_id', user.id).maybeSingle(),
  ])

  setDisputes(Array.isArray(disputes) ? disputes : [])

  if (student) {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('property_id, properties(id,name)')
      .eq('student_id', student.id)
      .eq('status', 'active')
    setProperties(enrollments?.map(e => e.properties).filter(Boolean) || [])
  }
  setLoading(false)
}

  async function handleSubmit() {
    if (!form.title || !form.description) return toast.error('Title and description are required')
    setSubmitting(true)
    try {
      const res = await fetch('/api/disputes', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ title:form.title, description:form.description, propertyId:form.propertyId||null }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Dispute raised successfully!')
      setShowForm(false)
      setForm({ title:'', description:'', propertyId:'' })
      fetchData()
    } catch { toast.error('Failed to raise dispute') }
    finally { setSubmitting(false) }
  }

  const statusColor = { open:'badge-warning', under_review:'badge-info', resolved:'badge-success', escalated:'badge-danger' }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-syne font-bold text-3xl text-white mb-1">Disputes</h1>
          <p className="text-[#7b82a8]">Raise and track disputes with your PG owner</p>
        </div>
        <button onClick={()=>setShowForm(!showForm)} className="bg-brand-500 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-600 transition-colors">
          + Raise Dispute
        </button>
      </div>

      {showForm && (
        <div className="bg-[#111527] border border-brand-500/20 rounded-2xl p-6 mb-8">
          <h2 className="font-syne font-bold text-lg text-white mb-4">New Dispute</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#7b82a8] mb-2 block">Property (optional)</label>
              <select value={form.propertyId} onChange={(e)=>setForm(p=>({...p,propertyId:e.target.value}))}
                className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white">
                <option value="">General complaint</option>
                {properties.map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#7b82a8] mb-2 block">Title *</label>
              <input value={form.title} onChange={(e)=>setForm(p=>({...p,title:e.target.value}))} placeholder="Brief title of the issue"
                className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070]" />
            </div>
            <div>
              <label className="text-xs text-[#7b82a8] mb-2 block">Description *</label>
              <textarea value={form.description} onChange={(e)=>setForm(p=>({...p,description:e.target.value}))} rows={4} placeholder="Describe the issue in detail..."
                className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070] resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleSubmit} disabled={submitting} className="bg-brand-500 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors">
                {submitting ? 'Submitting...' : 'Submit Dispute'}
              </button>
              <button onClick={()=>setShowForm(false)} className="bg-white/5 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-white/10 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_,i)=><div key={i} className="shimmer h-24 rounded-2xl" />)}</div>
      ) : disputes.length > 0 ? (
        <div className="space-y-4">
          {disputes.map((d) => (
            <div key={d.id} className="bg-[#111527] border border-white/5 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-white">{d.title}</div>
                  {d.properties?.name && <div className="text-xs text-[#7b82a8] mt-0.5">🏢 {d.properties.name}</div>}
                </div>
                <span className={`${statusColor[d.status]||'badge-muted'} text-xs px-2 py-0.5 rounded-full capitalize`}>{d.status?.replace('_',' ')}</span>
              </div>
              <p className="text-[#7b82a8] text-sm line-clamp-2">{d.description}</p>
              <div className="text-xs text-[#7b82a8] mt-3">Raised on {formatDate(d.created_at)}</div>
              {d.resolution_note && (
                <div className="mt-3 bg-accent-green/10 border border-accent-green/20 rounded-xl p-3 text-sm text-accent-green">
                  ✅ Resolution: {d.resolution_note}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">⚖️</div>
          <div className="text-white font-semibold mb-2">No disputes yet</div>
          <div className="text-[#7b82a8]">Raise a dispute if you have any issues with your accommodation</div>
        </div>
      )}
    </div>
  )
}