'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import StatCard from '@/components/dashboard/StatCard'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AdminDashboard() {
  const [data, setData]       = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [
      { count: totalUsers },
      { count: totalProperties },
      { count: pendingProperties },
      { count: activeEnrollments },
      { data: allDisputes },
      { data: recentPayments },
      { data: pendingApprovals },
      { data: snapshots },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('properties').select('*', { count: 'exact', head: true }),
      supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('disputes').select('id, status, title, created_at').order('created_at', { ascending: false }),
      // payments: no property_id column — only fetch columns that exist
      supabase.from('payments').select('id, amount, paid_at').eq('status', 'captured').order('paid_at', { ascending: false }).limit(8),
      supabase.from('properties').select('id, name, city, owner_id').eq('status', 'pending').limit(5),
      supabase.from('analytics_snapshots').select('snapshot_date, total_revenue').order('snapshot_date', { ascending: true }).limit(180),
    ])

    // Dispute counts
    const disputes           = allDisputes || []
    const openCount          = disputes.filter(d => d.status === 'open').length
    const underReviewCount   = disputes.filter(d => d.status === 'under_review').length
    const escalatedCount     = disputes.filter(d => d.status === 'escalated').length
    const unresolvedDisputes = openCount + underReviewCount + escalatedCount
    const escalatedList      = disputes.filter(d => d.status === 'escalated').slice(0, 5)

    // ✅ Platform revenue from analytics_snapshots (same source as chart)
    const snaps        = snapshots || []
    const totalRevenue = snaps.reduce((s, snap) => s + (snap.total_revenue || 0), 0)
    const platformRevenue = Math.floor(totalRevenue * 0.01)

    // Fetch owner names for pending approvals separately
    let approvalsWithOwners = pendingApprovals || []
    if (approvalsWithOwners.length > 0) {
      const ownerIds = [...new Set(approvalsWithOwners.map(p => p.owner_id).filter(Boolean))]
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase.from('users').select('id, full_name').in('id', ownerIds)
        const ownerMap = Object.fromEntries((owners || []).map(o => [o.id, o]))
        approvalsWithOwners = approvalsWithOwners.map(p => ({ ...p, owner: ownerMap[p.owner_id] }))
      }
    }

    // Build revenue chart grouped by month from snapshots
    const byMonth = {}
    snaps.forEach(s => {
      const m = s.snapshot_date?.slice(0, 7)
      if (m) byMonth[m] = (byMonth[m] || 0) + (s.total_revenue || 0)
    })
    const revenueChart = Object.entries(byMonth).slice(-6).map(([month, revenue]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      revenue,
    }))

    setData({
      totalUsers, totalProperties, pendingProperties, activeEnrollments,
      unresolvedDisputes, openCount, underReviewCount, escalatedCount,
      totalRevenue, platformRevenue,
      recentPayments: recentPayments || [],
      pendingApprovals: approvalsWithOwners,
      revenueChart,
      escalatedList,
    })
    setLoading(false)
  }

  async function approveProperty(id) {
    await supabase.from('properties').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
    toast.success('Property approved!')
    fetchData()
  }

  async function rejectProperty(id) {
    if (!confirm('Reject this property?')) return
    await supabase.from('properties').update({ status: 'rejected' }).eq('id', id)
    toast.error('Property rejected')
    fetchData()
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-syne font-bold text-2xl sm:text-3xl lg:text-4xl text-white mb-1">Admin Console</h1>
        <p className="text-sm sm:text-base text-[#7b82a8]">Platform overview and management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        <StatCard icon="👥" label="Total Users"      value={data.totalUsers || 0}          color="#4f6ef7" loading={loading} />
        <StatCard icon="🏢" label="Properties"       value={data.totalProperties || 0}     sub={`${data.pendingProperties || 0} pending`} color="#06d6a0" loading={loading} />
        <StatCard icon="🎓" label="Active Students"  value={data.activeEnrollments || 0}   color="#7c3aed" loading={loading} />
        <StatCard icon="⚖️" label="Unresolved"      value={data.unresolvedDisputes || 0}   sub={`${data.openCount||0} open · ${data.underReviewCount||0} review · ${data.escalatedCount||0} escalated`} color={data.unresolvedDisputes > 5 ? '#ff4d6d' : '#f5a623'} loading={loading} />
        <StatCard icon="💰" label="Platform Revenue" value={formatCurrency(data.platformRevenue || 0)} sub={`from ₹${((data.totalRevenue||0)/100).toLocaleString('en-IN')} collected`} color="#06d6a0" loading={loading} />
      </div>

      {/* Revenue Chart */}
      <div className="bg-[#111527] border border-white/5 rounded-2xl p-5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-syne font-bold text-white">Platform Revenue Trend</h2>
          <div className="text-right">
            <div className="text-xs text-[#7b82a8]">Total collected</div>
            <div className="text-accent-green font-bold">{formatCurrency(data.totalRevenue || 0)}</div>
          </div>
        </div>
        {data.revenueChart?.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.revenueChart}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f6ef7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f6ef7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" stroke="#7b82a8" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis stroke="#7b82a8" fontSize={12} axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#111527', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}
                formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#4f6ef7" strokeWidth={2} fill="url(#rg)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-[#7b82a8]">No revenue data yet</div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-syne font-bold text-white">Pending Approvals</h2>
            <Link href="/admin/properties" className="text-brand-400 text-sm hover:text-brand-300">View all →</Link>
          </div>
          {data.pendingApprovals?.length > 0 ? (
            <div className="space-y-3">
              {data.pendingApprovals.map(prop => (
                <div key={prop.id} className="flex items-center justify-between gap-3 p-3 bg-[#1a2035] rounded-xl">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{prop.name}</div>
                    <div className="text-xs text-[#7b82a8]">{prop.city} · {prop.owner?.full_name}</div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => approveProperty(prop.id)}
                      className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-1.5 rounded-lg font-semibold">✓ Approve</button>
                    <button onClick={() => rejectProperty(prop.id)}
                      className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg font-semibold">✗ Reject</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#7b82a8]">No pending approvals 🎉</div>
          )}
        </div>

        {/* Escalated Disputes */}
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-syne font-bold text-white flex items-center gap-2">
              {data.escalatedCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />}
              Escalated Disputes
            </h2>
            <Link href="/admin/disputes" className="text-brand-400 text-sm hover:text-brand-300">Manage all →</Link>
          </div>
          {data.escalatedList?.length > 0 ? (
            <div className="space-y-3">
              {data.escalatedList.map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{d.title}</div>
                    <div className="text-xs text-[#7b82a8]">{formatDate(d.created_at)}</div>
                  </div>
                  <Link href="/admin/disputes" className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 ml-3">
                    Review →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#7b82a8]">No escalated disputes 🎉</div>
          )}
        </div>
      </div>
    </div>
  )
}