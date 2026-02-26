'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import StatCard from '@/components/dashboard/StatCard'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

export default function OwnerDashboard() {
  const { user } = useUser()
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    const { data: owner } = await supabase.from('users').select('id').eq('clerk_id',user.id).single()
    if (!owner) { setLoading(false); return }
    const { data: properties } = await supabase.from('properties').select('id,name,status,current_price,rooms(status)').eq('owner_id',owner.id)
    const propIds = properties?.map(p=>p.id)||[]
    const [{ data: snapshots },{ data: invoices },{ count: activeStudents }] = await Promise.all([
      supabase.from('analytics_snapshots').select('*').in('property_id',propIds).order('snapshot_date',{ascending:true}).limit(50),
      supabase.from('invoices').select('*,users(full_name)').in('property_id',propIds).order('created_at',{ascending:false}).limit(10),
      supabase.from('enrollments').select('*',{count:'exact',head:true}).in('property_id',propIds).eq('status','active'),
    ])
    const totalRevenue = snapshots?.reduce((sum,s)=>sum+(s.total_revenue||0),0)||0
    const totalRooms = properties?.flatMap(p=>p.rooms).length||0
    const filledRooms = properties?.flatMap(p=>p.rooms).filter(r=>r?.status==='filled').length||0
    const occupancyRate = totalRooms ? Math.round((filledRooms/totalRooms)*100) : 0
    const overdueCount = invoices?.filter(i=>i.status==='overdue').length||0
    const latePaymentPct = invoices?.length ? Math.round((overdueCount/invoices.length)*100) : 0
    const revenueByMonth = {}
    snapshots?.forEach(s=>{ const m=s.snapshot_date?.slice(0,7); if(!revenueByMonth[m]) revenueByMonth[m]=0; revenueByMonth[m]+=(s.total_revenue||0) })
    const chartData = Object.entries(revenueByMonth).slice(-8).map(([month,revenue])=>({ month:new Date(month+'-01').toLocaleDateString('en-IN',{month:'short'}), revenue:revenue/100 }))
    const pieData = [{ name:'Occupied',value:filledRooms,color:'#4f6ef7' },{ name:'Available',value:totalRooms-filledRooms,color:'#1a2035' }]
    setData({ properties, snapshots, invoices, activeStudents, totalRevenue, totalRooms, filledRooms, occupancyRate, latePaymentPct, chartData, pieData })
    setLoading(false)
  }

  const d = data

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">Owner Dashboard</h1>
        <p className="text-[#7b82a8]">Real-time analytics for your properties</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="💰" label="Total Revenue" value={formatCurrency(d.totalRevenue)} sub="All time" color="#06d6a0" loading={loading} />
        <StatCard icon="👥" label="Active Students" value={d.activeStudents||0} sub="Enrolled tenants" color="#4f6ef7" loading={loading} />
        <StatCard icon="🏢" label="Occupancy Rate" value={`${d.occupancyRate||0}%`} sub={`${d.filledRooms||0}/${d.totalRooms||0} rooms`} color="#7c3aed" loading={loading} />
        <StatCard icon="⚠️" label="Late Payments" value={`${d.latePaymentPct||0}%`} sub="Of all invoices" color={d.latePaymentPct>10?'#ff4d6d':'#06d6a0'} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-[#111527] border border-white/5 rounded-2xl p-6">
          <h2 className="font-syne font-bold text-lg mb-6">Monthly Revenue</h2>
          {d.chartData?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={d.chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f6ef7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f6ef7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" stroke="#7b82a8" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis stroke="#7b82a8" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(v)=>`₹${v.toLocaleString('en-IN')}`} />
                <Tooltip contentStyle={{ background:'#111527', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10 }} labelStyle={{color:'#7b82a8'}} itemStyle={{color:'#fff'}} formatter={(v)=>[`₹${v.toLocaleString('en-IN')}`,'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#4f6ef7" strokeWidth={2} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-[#7b82a8]">No revenue data yet</div>
          )}
        </div>

        <div className="bg-[#111527] border border-white/5 rounded-2xl p-6">
          <h2 className="font-syne font-bold text-lg mb-6">Room Occupancy</h2>
          {d.pieData && (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={d.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {d.pieData.map((entry,i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background:'#111527', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2 text-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-brand-500" /><span className="text-[#7b82a8]">Occupied ({d.filledRooms})</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#1a2035] border border-white/10" /><span className="text-[#7b82a8]">Free ({(d.totalRooms||0)-(d.filledRooms||0)})</span></div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-[#111527] border border-white/5 rounded-2xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h2 className="font-syne font-bold text-lg text-white">Recent Invoices</h2>
          <Link href="/owner/billing" className="text-brand-400 text-sm hover:text-brand-300">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead><tr>
              <th>Student</th><th>Month</th><th>Amount</th><th>Status</th><th>Due Date</th>
            </tr></thead>
            <tbody>
              {loading ? [...Array(5)].map((_,i)=>(
                <tr key={i}>{[...Array(5)].map((_,j)=><td key={j} className="p-4"><div className="shimmer h-4 rounded" /></td>)}</tr>
              )) : d.invoices?.length > 0 ? d.invoices.map((inv)=>(
                <tr key={inv.id}>
                  <td className="p-4 text-white text-sm">{inv.users?.full_name||'—'}</td>
                  <td className="p-4 text-[#7b82a8] text-sm">{new Date(inv.billing_month).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</td>
                  <td className="p-4 text-white text-sm font-semibold">{formatCurrency(inv.total_amount)}</td>
                  <td className="p-4"><span className={`${inv.status==='paid'?'badge-success':inv.status==='overdue'?'badge-danger':'badge-warning'} text-xs px-2 py-0.5 rounded-full capitalize`}>{inv.status}</span></td>
                  <td className="p-4 text-[#7b82a8] text-sm">{formatDate(inv.due_date)}</td>
                </tr>
              )) : <tr><td colSpan={5} className="p-8 text-center text-[#7b82a8]">No invoices yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}