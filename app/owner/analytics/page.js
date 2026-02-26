'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import StatCard from '@/components/dashboard/StatCard'

const COLORS = ['#4f6ef7','#06d6a0','#7c3aed','#f5a623','#ff4d6d']

export default function OwnerAnalyticsPage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [selectedProp, setSelectedProp] = useState('all')
  const [properties, setProperties] = useState([])
  const [analytics, setAnalytics] = useState({})
  const [range, setRange] = useState(6)

  useEffect(() => { if (user) fetchData() }, [user, selectedProp, range])

  async function fetchData() {
    const { data: owner } = await supabase.from('users').select('id').eq('clerk_id', user.id).single()
    if (!owner) { setLoading(false); return }
    const { data: props } = await supabase.from('properties').select('id,name,city,current_price,rooms(status)').eq('owner_id', owner.id)
    setProperties(props || [])
    const propIds = selectedProp === 'all' ? (props?.map(p=>p.id)||[]) : [selectedProp]
    if (!propIds.length) { setLoading(false); return }
    const [{ data: invoices }, { data: enrollments }, { count: disputes }] = await Promise.all([
      supabase.from('invoices').select('*').in('property_id', propIds).order('billing_month', { ascending: false }),
      supabase.from('enrollments').select('*,users(full_name),rooms(room_number),properties(name)').in('property_id', propIds).eq('status','active'),
      supabase.from('disputes').select('*',{count:'exact',head:true}).in('property_id', propIds).eq('status','open'),
    ])
    const revenueByMonth = {}
    invoices?.filter(i=>i.status==='paid').forEach(inv=>{
      const m = inv.billing_month?.slice(0,7)
      if (!revenueByMonth[m]) revenueByMonth[m] = 0
      revenueByMonth[m] += inv.total_amount
    })
    const revenueChart = Object.entries(revenueByMonth).slice(-range).map(([month, rev])=>({
      month: new Date(month+'-01').toLocaleDateString('en-IN',{month:'short',year:'2-digit'}),
      revenue: rev / 100,
    }))
    const statusMap = { paid:0, pending:0, overdue:0 }
    invoices?.forEach(i=>{ if (statusMap[i.status]!==undefined) statusMap[i.status]++ })
    const paymentPie = Object.entries(statusMap).map(([name,value],i)=>({ name, value, color:COLORS[i] }))
    const occupancyByProp = (props||[]).map(p=>{
      const total = p.rooms?.length || 0
      const filled = p.rooms?.filter(r=>r.status==='filled').length || 0
      return { name: p.name.length>14?p.name.slice(0,14)+'...':p.name, occupancy: total?Math.round((filled/total)*100):0, total, filled }
    })
    const totalRevenue = invoices?.filter(i=>i.status==='paid').reduce((s,i)=>s+i.total_amount,0)||0
    const pendingRevenue = invoices?.filter(i=>['pending','overdue'].includes(i.status)).reduce((s,i)=>s+i.total_amount,0)||0
    const allRooms = (props||[]).flatMap(p=>p.rooms||[])
    const occupancyRate = allRooms.length ? Math.round((allRooms.filter(r=>r.status==='filled').length/allRooms.length)*100) : 0
    const overdueCount = invoices?.filter(i=>i.status==='overdue').length||0
    const latePayPct = invoices?.length ? Math.round((overdueCount/invoices.length)*100) : 0
    setAnalytics({ revenueChart, paymentPie, occupancyByProp, totalRevenue, pendingRevenue, occupancyRate, latePayPct, activeStudents:enrollments?.length||0, openDisputes:disputes||0, enrollments })
    setLoading(false)
  }

  const d = analytics

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">Analytics</h1>
        <p className="text-[#7b82a8]">Deep insights into your property portfolio</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <select value={selectedProp} onChange={e=>{setSelectedProp(e.target.value);setLoading(true)}}
          className="bg-[#111527] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white">
          <option value="all">All Properties</option>
          {properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex bg-[#111527] border border-white/5 rounded-xl p-1 gap-1">
          {[3,6,12].map(m=>(
            <button key={m} onClick={()=>setRange(m)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${range===m?'bg-brand-500 text-white':'text-[#7b82a8] hover:text-white'}`}>{m}M</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon="💰" label="Total Revenue" value={formatCurrency(d.totalRevenue||0)} sub="All paid" color="#06d6a0" loading={loading} />
        <StatCard icon="⏳" label="Pending" value={formatCurrency(d.pendingRevenue||0)} color="#f5a623" loading={loading} />
        <StatCard icon="🏢" label="Occupancy" value={`${d.occupancyRate||0}%`} color="#4f6ef7" loading={loading} />
        <StatCard icon="⚠️" label="Late Pay %" value={`${d.latePayPct||0}%`} color={d.latePayPct>15?'#ff4d6d':'#06d6a0'} loading={loading} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="👥" label="Active Students" value={d.activeStudents||0} color="#7c3aed" loading={loading} />
        <StatCard icon="⚖️" label="Open Disputes" value={d.openDisputes||0} color={d.openDisputes>3?'#ff4d6d':'#06d6a0'} loading={loading} />
        <StatCard icon="🏘️" label="Properties" value={properties.length} color="#4f6ef7" loading={loading} />
        <StatCard icon="🚪" label="Total Rooms" value={properties.flatMap(p=>p.rooms||[]).length} color="#06d6a0" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-[#111527] border border-white/5 rounded-2xl p-6">
          <h2 className="font-syne font-bold text-lg text-white mb-6">Monthly Revenue (₹)</h2>
          {d.revenueChart?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={d.revenueChart}>
                <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f6ef7" stopOpacity={0.3}/><stop offset="95%" stopColor="#4f6ef7" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                <XAxis dataKey="month" stroke="#7b82a8" fontSize={12} axisLine={false} tickLine={false}/>
                <YAxis stroke="#7b82a8" fontSize={12} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                <Tooltip contentStyle={{background:'#111527',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10}} formatter={v=>[`₹${v.toLocaleString('en-IN')}`,'Revenue']}/>
                <Area type="monotone" dataKey="revenue" stroke="#4f6ef7" strokeWidth={2} fill="url(#rg)"/>
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-56 flex items-center justify-center text-[#7b82a8]">No revenue data yet</div>}
        </div>
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-6">
          <h2 className="font-syne font-bold text-lg text-white mb-6">Payment Status</h2>
          {d.paymentPie?.some(p=>p.value>0) ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart><Pie data={d.paymentPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {d.paymentPie?.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie><Tooltip contentStyle={{background:'#111527',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10}}/></PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {d.paymentPie?.map(p=>(
                  <div key={p.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{background:p.color}}/><span className="text-[#7b82a8] capitalize">{p.name}</span></div>
                    <span className="text-white font-semibold">{p.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="h-40 flex items-center justify-center text-[#7b82a8]">No invoice data</div>}
        </div>
      </div>

      {d.occupancyByProp?.length > 1 && (
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-6 mb-6">
          <h2 className="font-syne font-bold text-lg text-white mb-6">Occupancy by Property</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d.occupancyByProp}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="name" stroke="#7b82a8" fontSize={11} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,100]} stroke="#7b82a8" fontSize={11} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
              <Tooltip contentStyle={{background:'#111527',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10}} formatter={(v,n,p)=>[`${v}% (${p.payload.filled}/${p.payload.total})`,'Occupancy']}/>
              <Bar dataKey="occupancy" radius={[6,6,0,0]}>
                {d.occupancyByProp?.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-[#111527] border border-white/5 rounded-2xl">
        <div className="p-6 border-b border-white/5"><h2 className="font-syne font-bold text-lg text-white">Active Tenants</h2></div>
        {loading ? <div className="p-6 space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="shimmer h-12 rounded-xl"/>)}</div>
        : d.enrollments?.length > 0 ? (
          <table className="w-full data-table">
            <thead><tr><th>Student</th><th>Property</th><th>Room</th><th>Monthly Rent</th><th>Since</th></tr></thead>
            <tbody>
              {d.enrollments.map(e=>(
                <tr key={e.id}>
                  <td className="p-4 text-white text-sm">{e.users?.full_name||'—'}</td>
                  <td className="p-4 text-[#7b82a8] text-sm">{e.properties?.name||'—'}</td>
                  <td className="p-4 text-[#7b82a8] text-sm">{e.rooms?.room_number?`#${e.rooms.room_number}`:'—'}</td>
                  <td className="p-4 text-brand-400 font-semibold text-sm">{formatCurrency(e.monthly_rent)}</td>
                  <td className="p-4 text-[#7b82a8] text-sm">{new Date(e.enrolled_at||e.created_at).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="text-center py-12 text-[#7b82a8]">No active tenants yet</div>}
      </div>
    </div>
  )
}