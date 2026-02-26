'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'

export default function InOutLogsPage() {
  const { user } = useUser()
  const [logs, setLogs] = useState([])
  const [properties, setProperties] = useState([])
  const [selectedProp, setSelectedProp] = useState('')
  const [dateFilter, setDateFilter] = useState('today')
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) fetchData() }, [user, selectedProp, dateFilter])

  async function fetchData() {
    const { data: owner } = await supabase.from('users').select('id').eq('clerk_id', user.id).single()
    if (!owner) { setLoading(false); return }
    const { data: props } = await supabase.from('properties').select('id,name').eq('owner_id', owner.id)
    setProperties(props || [])
    const propIds = selectedProp ? [selectedProp] : (props?.map(p=>p.id)||[])
    let query = supabase.from('inout_logs').select('*,users(full_name),properties(name)').in('property_id', propIds).order('scanned_at', { ascending: false })
    if (dateFilter === 'today') {
      const t = new Date(); t.setHours(0,0,0,0)
      query = query.gte('scanned_at', t.toISOString())
    } else if (dateFilter === 'week') {
      const w = new Date(); w.setDate(w.getDate()-7)
      query = query.gte('scanned_at', w.toISOString())
    }
    const { data } = await query.limit(200)
    setLogs(data || [])
    setLoading(false)
  }

  // Compute current inside/outside per student (last log per student per property)
  const latestPerStudent = {}
  for (const log of logs) {
    const key = `${log.student_id}-${log.property_id}`
    if (!latestPerStudent[key]) latestPerStudent[key] = log
  }
  const totalInside = Object.values(latestPerStudent).filter(l=>l.scan_type==='in').length
  const violations = logs.filter(l=>l.is_curfew_violation).length

  const propStatusMap = {}
  Object.values(latestPerStudent).forEach(l=>{
    if (!propStatusMap[l.property_id]) propStatusMap[l.property_id] = { inside:0, outside:0 }
    if (l.scan_type==='in') propStatusMap[l.property_id].inside++
    else propStatusMap[l.property_id].outside++
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">In/Out Logs</h1>
        <p className="text-[#7b82a8]">Real-time gate entry and exit tracking for all your properties</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111527] border border-accent-green/20 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-accent-green animate-pulse flex-shrink-0" />
          <div>
            <div className="font-syne font-bold text-2xl text-accent-green">{totalInside}</div>
            <div className="text-[#7b82a8] text-sm">Currently Inside</div>
          </div>
        </div>
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-5">
          <div className="font-syne font-bold text-2xl text-white">{logs.length}</div>
          <div className="text-[#7b82a8] text-sm">Scans ({dateFilter})</div>
        </div>
        <div className={`bg-[#111527] border rounded-2xl p-5 ${violations>0?'border-accent-red/20':'border-white/5'}`}>
          <div className={`font-syne font-bold text-2xl ${violations>0?'text-accent-red':'text-white'}`}>{violations}</div>
          <div className="text-[#7b82a8] text-sm">Curfew Violations</div>
        </div>
      </div>

      {properties.length > 1 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {properties.map(p=>(
            <div key={p.id} className="bg-[#111527] border border-white/5 rounded-xl p-4">
              <div className="font-semibold text-white text-sm mb-2 truncate">{p.name}</div>
              <div className="flex gap-3 text-xs">
                <span className="text-accent-green">🟢 {propStatusMap[p.id]?.inside||0} inside</span>
                <span className="text-[#7b82a8]">🔴 {propStatusMap[p.id]?.outside||0} outside</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 mb-6 flex-wrap">
        <select value={selectedProp} onChange={e=>{setSelectedProp(e.target.value);setLoading(true)}}
          className="bg-[#111527] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white">
          <option value="">All Properties</option>
          {properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex bg-[#111527] border border-white/5 rounded-xl p-1 gap-1">
          {[['today','Today'],['week','This Week'],['all','All Time']].map(([v,l])=>(
            <button key={v} onClick={()=>{setDateFilter(v);setLoading(true)}}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${dateFilter===v?'bg-brand-500 text-white':'text-[#7b82a8] hover:text-white'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="bg-[#111527] border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full data-table">
          <thead><tr><th>Student</th><th>Property</th><th>Action</th><th>Time (IST)</th><th>Curfew</th></tr></thead>
          <tbody>
            {loading ? [...Array(8)].map((_,i)=><tr key={i}>{[...Array(5)].map((_,j)=><td key={j} className="p-4"><div className="shimmer h-4 rounded"/></td>)}</tr>)
            : logs.length > 0 ? logs.map(log=>(
              <tr key={log.id} className={log.is_curfew_violation?'bg-accent-red/5':''}>
                <td className="p-4 text-white text-sm font-medium">{log.users?.full_name}</td>
                <td className="p-4 text-[#7b82a8] text-sm">{log.properties?.name}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${log.scan_type==='in'?'badge-success':'badge-danger'}`}>
                    {log.scan_type==='in'?'🟢 Check IN':'🔴 Check OUT'}
                  </span>
                </td>
                <td className="p-4 text-[#7b82a8] text-sm">{new Date(log.scanned_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                <td className="p-4">{log.is_curfew_violation?<span className="badge-danger text-xs px-2 py-1 rounded-full">⚠️ Violation</span>:<span className="text-[#7b82a8]">—</span>}</td>
              </tr>
            )) : <tr><td colSpan={5} className="p-8 text-center text-[#7b82a8]">No logs for selected filters</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
