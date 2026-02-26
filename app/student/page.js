'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import StatCard from '@/components/dashboard/StatCard'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

export default function StudentDashboard() {
  const { user } = useUser()
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    try {
      const { data: student } = await supabase.from('users').select('id,referral_code').eq('clerk_id', user.id).single()
      if (!student) { setLoading(false); return }

      const [
        { data: enrollment },
        { data: pendingInvoice },
        { data: recentPayments },
        { data: lastLog },
        { count: referralCount },
      ] = await Promise.all([
        supabase.from('enrollments').select('*,properties(name,address,city,images)').eq('student_id',student.id).eq('status','active').single(),
        supabase.from('invoices').select('*').eq('student_id',student.id).neq('status','paid').order('created_at',{ascending:false}).limit(1).single(),
        supabase.from('payments').select('*').eq('student_id',student.id).eq('status','captured').order('paid_at',{ascending:false}).limit(5),
        supabase.from('inout_logs').select('*').eq('student_id',student.id).order('scanned_at',{ascending:false}).limit(1).single(),
        supabase.from('referrals').select('*',{count:'exact',head:true}).eq('referrer_id',student.id),
      ])

      setData({ student, enrollment, pendingInvoice, recentPayments:recentPayments||[], lastLog, referralCount:referralCount||0 })
    } catch(err) { console.error(err) }
    finally { setLoading(false) }
  }

  const { enrollment, pendingInvoice, recentPayments, lastLog, referralCount } = data

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">Hey, {user?.firstName} 👋</h1>
        <p className="text-[#7b82a8]">Here's what's happening with your accommodation</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="💳" label="Due This Month" value={pendingInvoice ? formatCurrency(pendingInvoice.total_amount) : '₹0'} sub={pendingInvoice ? `Due ${formatDate(pendingInvoice.due_date)}` : 'All paid up!'} color={pendingInvoice?'#f5a623':'#06d6a0'} loading={loading} />
        <StatCard icon={lastLog?.scan_type==='in'?'🟢':'🔴'} label="Current Status" value={lastLog?(lastLog.scan_type==='in'?'Inside':'Outside'):'No logs'} sub={lastLog?formatDate(lastLog.scanned_at,{hour:'2-digit',minute:'2-digit'}):'—'} color="#4f6ef7" loading={loading} />
        <StatCard icon="🎁" label="Referrals" value={referralCount||0} sub="Successful referrals" color="#7c3aed" loading={loading} />
        <StatCard icon="🏠" label="Accommodation" value={enrollment?'Active':'None'} sub={enrollment?.properties?.name||'Find a PG to enroll'} color="#06d6a0" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Accommodation */}
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-6">
          <h2 className="font-syne font-bold text-lg mb-4">Current Accommodation</h2>
          {enrollment ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 rounded-xl bg-[#1a2035] flex items-center justify-center text-2xl overflow-hidden">
                  {enrollment.properties?.images?.[0] ? <img src={enrollment.properties.images[0]} alt="" className="w-full h-full object-cover" /> : '🏠'}
                </div>
                <div>
                  <div className="font-bold text-white">{enrollment.properties?.name}</div>
                  <div className="text-[#7b82a8] text-sm">📍 {enrollment.properties?.city}</div>
                  <div className="text-accent-green text-sm font-semibold">{formatCurrency(enrollment.monthly_rent)}/month</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/student/qr" className="flex-1 text-center bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 text-sm font-semibold py-2 rounded-lg transition-colors">📲 My QR Code</Link>
                <Link href="/student/payments" className="flex-1 text-center bg-white/5 text-white hover:bg-white/10 text-sm font-semibold py-2 rounded-lg transition-colors">💳 Payments</Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🔍</div>
              <div className="text-[#7b82a8] mb-4">You haven't enrolled in a PG yet</div>
              <Link href="/student/properties" className="bg-brand-500 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-brand-600 transition-colors inline-block">Find a PG →</Link>
            </div>
          )}
        </div>

        {/* Pending Invoice */}
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-6">
          <h2 className="font-syne font-bold text-lg mb-4">Next Payment</h2>
          {pendingInvoice ? (
            <div>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm"><span className="text-[#7b82a8]">Base Rent</span><span className="text-white">{formatCurrency(pendingInvoice.base_rent)}</span></div>
                {pendingInvoice.electricity_amount>0 && <div className="flex justify-between text-sm"><span className="text-[#7b82a8]">⚡ Electricity</span><span className="text-white">{formatCurrency(pendingInvoice.electricity_amount)}</span></div>}
                {pendingInvoice.late_fee>0 && <div className="flex justify-between text-sm"><span className="text-accent-red">⚠️ Late Fee</span><span className="text-accent-red">{formatCurrency(pendingInvoice.late_fee)}</span></div>}
                <div className="border-t border-white/5 pt-3 flex justify-between">
                  <span className="font-semibold text-white">Total Due</span>
                  <span className="font-syne font-bold text-xl text-brand-400">{formatCurrency(pendingInvoice.total_amount)}</span>
                </div>
              </div>
              <div className="bg-accent-gold/10 border border-accent-gold/20 rounded-xl p-3 mb-4 text-sm text-accent-gold">📅 Due by {formatDate(pendingInvoice.due_date)}</div>
              <Link href="/student/payments" className="block w-full text-center bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity">Pay Now →</Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-accent-green font-semibold">All payments up to date!</div>
              <div className="text-[#7b82a8] text-sm mt-1">Next invoice on the 1st</div>
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-syne font-bold text-lg">Recent Payments</h2>
            <Link href="/student/payments" className="text-brand-400 text-sm hover:text-brand-300">View all →</Link>
          </div>
          {recentPayments?.length > 0 ? (
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-white">Rent Payment</div>
                    <div className="text-xs text-[#7b82a8]">{formatDate(payment.paid_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-accent-green font-semibold">{formatCurrency(payment.amount)}</div>
                    <span className="badge-success text-xs px-2 py-0.5 rounded-full">Paid</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[#7b82a8] text-sm text-center py-6">No payments yet</div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-6">
          <h2 className="font-syne font-bold text-lg mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label:'Find PG',       icon:'🔍', href:'/student/properties', color:'#4f6ef7' },
              { label:'My QR',         icon:'📲', href:'/student/qr',         color:'#06d6a0' },
              { label:'Raise Dispute', icon:'⚖️', href:'/student/disputes',   color:'#f5a623' },
              { label:'Refer Friend',  icon:'🎁', href:'/student/referrals',  color:'#7c3aed' },
              { label:'AI Assistant',  icon:'🤖', href:'/student/ai-chat',    color:'#06d6a0' },
              { label:'Attendance',    icon:'📋', href:'/student/attendance', color:'#ff4d6d' },
            ].map((action) => (
              <Link key={action.href} href={action.href} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background:`${action.color}20` }}>{action.icon}</div>
                <span className="text-sm font-medium text-white/80 group-hover:text-white">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}