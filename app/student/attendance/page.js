'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

export default function AttendancePage() {
  const { user } = useUser()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ ins:0, outs:0, violations:0 })

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    const { data: student } = await supabase.from('users').select('id').eq('clerk_id',user.id).single()
    if (!student) { setLoading(false); return }
    const { data: logData } = await supabase.from('inout_logs').select('*').eq('student_id',student.id).order('scanned_at',{ascending:false}).limit(50)
    setLogs(logData||[])
    setStats({
      ins: logData?.filter(l=>l.scan_type==='in').length||0,
      outs: logData?.filter(l=>l.scan_type==='out').length||0,
      violations: logData?.filter(l=>l.is_curfew_violation).length||0,
    })
    setLoading(false)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">Attendance Log</h1>
        <p className="text-[#7b82a8]">Your entry and exit history</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">🟢</div>
          <div className="font-syne font-bold text-2xl text-white">{stats.ins}</div>
          <div className="text-[#7b82a8] text-sm">Check-ins</div>
        </div>
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">🔴</div>
          <div className="font-syne font-bold text-2xl text-white">{stats.outs}</div>
          <div className="text-[#7b82a8] text-sm">Check-outs</div>
        </div>
        <div className="bg-[#111527] border border-accent-red/20 rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">🚨</div>
          <div className="font-syne font-bold text-2xl text-accent-red">{stats.violations}</div>
          <div className="text-[#7b82a8] text-sm">Curfew Violations</div>
        </div>
      </div>

      <div className="bg-[#111527] border border-white/5 rounded-2xl">
        <div className="p-6 border-b border-white/5">
          <h2 className="font-syne font-bold text-lg text-white">Entry/Exit Log</h2>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(6)].map((_,i)=><div key={i} className="shimmer h-14 rounded-xl" />)}</div>
        ) : logs.length > 0 ? (
          <div className="divide-y divide-white/5">
            {logs.map((log) => (
              <div key={log.id} className={`flex items-center justify-between p-4 ${log.is_curfew_violation?'bg-accent-red/5':''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${log.scan_type==='in'?'bg-accent-green/10':'bg-accent-red/10'}`}>
                    {log.scan_type === 'in' ? '🟢' : '🔴'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Check {log.scan_type === 'in' ? 'IN' : 'OUT'}</div>
                    <div className="text-xs text-[#7b82a8]">{new Date(log.scanned_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</div>
                  </div>
                </div>
                {log.is_curfew_violation && (
                  <span className="badge-danger text-xs px-2 py-0.5 rounded-full">⚠️ Curfew Violation</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <div className="text-[#7b82a8]">No entry/exit logs yet. Your QR scan history will appear here.</div>
          </div>
        )}
      </div>
    </div>
  )
}