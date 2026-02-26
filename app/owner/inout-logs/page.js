'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'

export default function InOutLogsPage() {
  const { user } = useUser()
  const [logs, setLogs] = useState([])
  const [properties, setProperties] = useState([])
  const [selectedProp, setSelectedProp] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) fetchData() }, [user, selectedProp])

  async function fetchData() {
    const { data: owner } = await supabase.from('users').select('id').eq('clerk_id',user.id).single()
    if (!owner) { setLoading(false); return }
    const { data: props } = await supabase.from('properties').select('id,name').eq('owner_id',owner.id)
    setProperties(props||[])
    const propIds = selectedProp ? [selectedProp] : (props?.map(p=>p.id)||[])
    const { data: logData } = await supabase.from('inout_logs').select('*,users(full_name),properties(name)').in('property_id',propIds).order('scanned_at',{ascending:false}).limit(100)
    setLogs(logData||[])
    setLoading(false)
  }

  const currentlyInside = logs.reduce((acc,log) => {
    const existing = acc.findIndex(l=>l.student_id===log.student_id)
    if (existing === -1) acc.push(log)
    return acc
  },[]).filter(l=>l.scan_type==='in').length

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">In/Out Logs</h1>
        <p className="text-[#7b82a8]">Real-time entry and exit tracking</p>
      </div>

      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3 bg-accent-green/10 border border-accent-green/20 rounded-xl px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          <span className="text-accent-green font-semibold">{currentlyInside} students currently inside</span>
        </div>
        <select value={selectedProp} onChange={(e)=>setSelectedProp(e.target.value)}
          className="bg-[#111527] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white">
          <option value="">All Properties</option>
          {properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="bg-[#111527] border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full data-table">
          <thead><tr><th>Student</th><th>Property</th><th>Action</th><th>Time</th><th>Curfew</th></tr></thead>
          <tbody>
            {loading ? [...Array(8)].map((_,i)=>(
              <tr key={i}>{[...Array(5)].map((_,j)=><td key={j} className="p-4"><div className="shimmer h-4 rounded" /></td>)}</tr>
            )) : logs.length > 0 ? logs.map((log)=>(
              <tr key={log.id} className={log.is_curfew_violation?'bg-accent-red/5':''}>
                <td className="p-4 text-sm text-white">{log.users?.full_name}</td>
                <td className="p-4 text-sm text-[#7b82a8]">{log.properties?.name}</td>
                <td className="p-4">
                  <span className={`flex items-center gap-1.5 w-fit text-xs font-semibold px-2 py-1 rounded-full ${log.scan_type==='in'?'badge-success':'badge-danger'}`}>
                    {log.scan_type==='in'?'🟢 Check IN':'🔴 Check OUT'}
                  </span>
                </td>
                <td className="p-4 text-sm text-[#7b82a8]">{new Date(log.scanned_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'})}</td>
                <td className="p-4">{log.is_curfew_violation?<span className="badge-danger text-xs px-2 py-0.5 rounded-full">⚠️ Violation</span>:'—'}</td>
              </tr>
            )) : <tr><td colSpan={5} className="p-8 text-center text-[#7b82a8]">No logs found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}