'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import StatCard from '@/components/dashboard/StatCard'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [
      { count: totalUsers },
      { count: totalProperties },
      { count: pendingProperties },
      { count: openDisputes },
      { data: recentPayments },
      { data: pendingApprovals },
    ] = await Promise.all([
      supabase.from('users').select('*',{count:'exact',head:true}),
      supabase.from('properties').select('*',{count:'exact',head:true}),
      supabase.from('properties').select('*',{count:'exact',head:true}).eq('status','pending'),
      supabase.from('disputes').select('*',{count:'exact',head:true}).eq('status','open'),
      supabase.from('payments').select('*').eq('status','captured').order('paid_at',{ascending:false}).limit(10),
      supabase.from('properties').select('*,users(full_name,email)').eq('status','pending').limit(5),
    ])
    const totalRevenue = recentPayments?.reduce((sum,p)=>sum+(p.platform_fee||0),0)||0
    setData({ totalUsers, totalProperties, pendingProperties, openDisputes, recentPayments, pendingApprovals, totalRevenue })
    setLoading(false)
  }

  async function approveProperty(id) {
    await supabase.from('properties').update({ status:'approved', approved_at:new Date().toISOString() }).eq('id',id)
    toast.success('Property approved!')
    fetchData()
  }

  async function rejectProperty(id) {
    await supabase.from('properties').update({ status:'rejected' }).eq('id',id)
    toast.error('Property rejected')
    fetchData()
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">Admin Console</h1>
        <p className="text-[#7b82a8]">Platform overview and management</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="👥" label="Total Users" value={data.totalUsers||0} color="#4f6ef7" loading={loading} />
        <StatCard icon="🏢" label="Properties" value={data.totalProperties||0} sub={`${data.pendingProperties||0} pending`} color="#06d6a0" loading={loading} />
        <StatCard icon="⚖️" label="Open Disputes" value={data.openDisputes||0} color={data.openDisputes>5?'#ff4d6d':'#f5a623'} loading={loading} />
        <StatCard icon="💰" label="Platform Revenue" value={formatCurrency(data.totalRevenue||0)} sub="1% commission" color="#7c3aed" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-syne font-bold text-lg text-white">Pending Approvals</h2>
            <Link href="/admin/properties" className="text-brand-400 text-sm hover:text-brand-300">View all →</Link>
          </div>
          {data.pendingApprovals?.length > 0 ? (
            <div className="space-y-3">
              {data.pendingApprovals.map((prop) => (
                <div key={prop.id} className="flex items-center justify-between p-3 bg-[#1a2035] rounded-xl">
                  <div>
                    <div className="text-sm font-medium text-white">{prop.name}</div>
                    <div className="text-xs text-[#7b82a8]">{prop.city} · by {prop.users?.full_name}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>approveProperty(prop.id)} className="badge-success text-xs px-3 py-1.5 rounded-lg font-semibold hover:opacity-80 cursor-pointer">✓ Approve</button>
                    <button onClick={()=>rejectProperty(prop.id)} className="badge-danger text-xs px-3 py-1.5 rounded-lg font-semibold hover:opacity-80 cursor-pointer">✗ Reject</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#7b82a8]">No pending approvals 🎉</div>
          )}
        </div>

        <div className="bg-[#111527] border border-white/5 rounded-2xl p-6">
          <h2 className="font-syne font-bold text-lg text-white mb-4">Recent Transactions</h2>
          {data.recentPayments?.length > 0 ? (
            <div className="space-y-3">
              {data.recentPayments.slice(0,6).map((pay) => (
                <div key={pay.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <div>
                    <div className="text-sm text-white font-mono">{pay.razorpay_payment_id?.slice(0,20)}...</div>
                    <div className="text-xs text-[#7b82a8]">{formatDate(pay.paid_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-accent-green font-semibold text-sm">{formatCurrency(pay.amount)}</div>
                    <div className="text-xs text-[#7b82a8]">Fee: {formatCurrency(pay.platform_fee||0)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#7b82a8]">No transactions yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
