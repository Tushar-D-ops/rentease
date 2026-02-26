'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency, formatDate, statusBadgeClass } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function OwnerBillingPage() {
  const { user } = useUser()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    const { data: owner } = await supabase.from('users').select('id').eq('clerk_id',user.id).single()
    if (!owner) { setLoading(false); return }
    const { data: props } = await supabase.from('properties').select('id').eq('owner_id',owner.id)
    if (!props?.length) { setLoading(false); return }
    const { data: inv } = await supabase.from('invoices').select('*,users(full_name,email),properties(name)').in('property_id',props.map(p=>p.id)).order('billing_month',{ascending:false})
    setInvoices(inv||[])
    setLoading(false)
  }

  const filtered = filter==='all' ? invoices : invoices.filter(i=>i.status===filter)
  const stats = {
    total: invoices.reduce((s,i)=>s+i.total_amount,0),
    paid: invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+i.total_amount,0),
    pending: invoices.filter(i=>i.status==='pending').length,
    overdue: invoices.filter(i=>i.status==='overdue').length,
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">Billing</h1>
        <p className="text-[#7b82a8]">Track all invoices and payments across your properties</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-5">
          <div className="text-[#7b82a8] text-xs uppercase tracking-widest mb-2">Total Billed</div>
          <div className="font-syne font-bold text-2xl text-white">{formatCurrency(stats.total)}</div>
        </div>
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-5">
          <div className="text-[#7b82a8] text-xs uppercase tracking-widest mb-2">Collected</div>
          <div className="font-syne font-bold text-2xl text-accent-green">{formatCurrency(stats.paid)}</div>
        </div>
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-5">
          <div className="text-[#7b82a8] text-xs uppercase tracking-widest mb-2">Pending</div>
          <div className="font-syne font-bold text-2xl text-accent-gold">{stats.pending}</div>
        </div>
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-5">
          <div className="text-[#7b82a8] text-xs uppercase tracking-widest mb-2">Overdue</div>
          <div className="font-syne font-bold text-2xl text-accent-red">{stats.overdue}</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {['all','pending','paid','overdue'].map((f) => (
          <button key={f} onClick={()=>setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${filter===f?'bg-brand-500 text-white':'bg-[#111527] text-[#7b82a8] hover:text-white border border-white/5'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-[#111527] border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full data-table">
          <thead><tr><th>Student</th><th>Property</th><th>Month</th><th>Amount</th><th>Status</th><th>Due</th></tr></thead>
          <tbody>
            {loading ? [...Array(6)].map((_,i)=>(
              <tr key={i}>{[...Array(6)].map((_,j)=><td key={j} className="p-4"><div className="shimmer h-4 rounded" /></td>)}</tr>
            )) : filtered.length > 0 ? filtered.map((inv)=>(
              <tr key={inv.id}>
                <td className="p-4"><div className="text-sm text-white">{inv.users?.full_name}</div><div className="text-xs text-[#7b82a8]">{inv.users?.email}</div></td>
                <td className="p-4 text-[#7b82a8] text-sm">{inv.properties?.name}</td>
                <td className="p-4 text-[#7b82a8] text-sm">{new Date(inv.billing_month).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</td>
                <td className="p-4 text-white text-sm font-semibold">{formatCurrency(inv.total_amount)}</td>
                <td className="p-4"><span className={`${statusBadgeClass(inv.status)} text-xs px-2 py-0.5 rounded-full capitalize`}>{inv.status}</span></td>
                <td className="p-4 text-[#7b82a8] text-sm">{formatDate(inv.due_date)}</td>
              </tr>
            )) : <tr><td colSpan={6} className="p-8 text-center text-[#7b82a8]">No invoices found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}