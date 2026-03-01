'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency, formatDate, statusBadgeClass } from '@/lib/utils'
import toast from 'react-hot-toast'
import { format, startOfMonth, addDays } from 'date-fns'

export default function OwnerBillingPage() {
  const { user } = useUser()
  const [invoices, setInvoices] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedProp, setSelectedProp] = useState('all')
  const [triggeringBilling, setTriggeringBilling] = useState(false)

  useEffect(() => { if (user) fetchData() }, [user, selectedProp])

  async function fetchData() {
    const { data: owner } = await supabase.from('users').select('id').eq('clerk_id', user.id).single()
    if (!owner) { setLoading(false); return }
    const { data: props } = await supabase.from('properties').select('id,name').eq('owner_id', owner.id)
    setProperties(props || [])
    const propIds = selectedProp === 'all' ? (props?.map(p=>p.id)||[]) : [selectedProp]
    if (!propIds.length) { setLoading(false); return }
    const [{ data: inv }, { data: enr }] = await Promise.all([
      supabase.from('invoices').select('*,users(full_name,email),properties(name)').in('property_id', propIds).order('billing_month', { ascending: false }),
      supabase.from('enrollments').select('*,users(full_name,email),properties(name),rooms(room_number)').in('property_id', propIds).eq('status','active'),
    ])
    setInvoices(inv || [])
    setEnrollments(enr || [])
    setLoading(false)
  }

  async function handleManualBilling() {
    if (!confirm('Generate invoices for ALL active students this month? Duplicates will be skipped.')) return
    setTriggeringBilling(true)
    try {
      const res = await fetch('/api/cron/monthly-billing', {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'manual'}` }
      })
      const data = await res.json()
      if (data.results) {
        toast.success(`Done! ${data.results.success} created, ${data.results.skipped} skipped`)
        fetchData()
      } else toast.error(data.error || 'Failed')
    } catch { toast.error('Network error') }
    finally { setTriggeringBilling(false) }
  }

  async function handleManualInvoice(enrollment) {
    const billingMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const dueDate = format(addDays(startOfMonth(new Date()), 4), 'yyyy-MM-dd')
    const { data: existing } = await supabase.from('invoices').select('id').eq('enrollment_id',enrollment.id).eq('billing_month',billingMonth).single()
    if (existing) return toast.error('Invoice already exists for this month')
    const { error } = await supabase.from('invoices').insert({
      enrollment_id: enrollment.id, student_id: enrollment.student_id,
      property_id: enrollment.property_id, billing_month: billingMonth,
      base_rent: enrollment.monthly_rent, electricity_amount: 0, late_fee: 0, discount: 0,
      total_amount: enrollment.monthly_rent, due_date: dueDate, status: 'pending',
    })
    if (error) return toast.error(error.message)
    toast.success('Invoice created for ' + enrollment.users?.full_name)
    fetchData()
  }

  const filtered = filter === 'all' ? invoices : invoices.filter(i=>i.status===filter)
  const stats = {
    totalBilled: invoices.reduce((s,i)=>s+i.total_amount,0),
    collected: invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+i.total_amount,0),
    pending: invoices.filter(i=>i.status==='pending').length,
    overdue: invoices.filter(i=>i.status==='overdue').length,
  }
  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const studentsWithInvoice = new Set(invoices.filter(i=>i.billing_month===currentMonth).map(i=>i.student_id))
  const studentsWithoutInvoice = enrollments.filter(e=>!studentsWithInvoice.has(e.student_id))

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-syne font-bold text-2xl sm:text-3xl lg:text-4xl text-white mb-1">Billing</h1>
          <p className="text-[#7b82a8] text-sm sm:text-base">Manage invoices — cron runs 1st of each month automatically</p>
        </div>
        <button onClick={handleManualBilling} disabled={triggeringBilling}
          className="w-full sm:w-auto bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all duration-300 backdrop-blur-md">
          {triggeringBilling ? '⏳ Generating...' : '🔄 Trigger Monthly Billing'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[['Total Billed',formatCurrency(stats.totalBilled),'#fff'],['Collected',formatCurrency(stats.collected),'#06d6a0'],['Pending',stats.pending,'#f5a623'],['Overdue',stats.overdue,'#ff4d6d']].map(([l,v,c])=>(
          <div key={l} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="text-[#7b82a8] text-xs uppercase tracking-widest mb-2">{l}</div>
            <div className="font-syne font-bold text-2xl" style={{color:c}}>{v}</div>
          </div>
        ))}
      </div>

      {studentsWithoutInvoice.length > 0 && (
        <div className="bg-white/5 backdrop-blur-xl border border-accent-gold/30 rounded-2xl p-4 sm:p-6 mb-8 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">⚠️</span>
            <h2 className="font-syne font-bold text-white">{studentsWithoutInvoice.length} student{studentsWithoutInvoice.length>1?'s':''} without invoice this month</h2>
          </div>
          <div className="space-y-2">
            {studentsWithoutInvoice.map(e=>(
              <div key={e.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/5 backdrop-blur-md rounded-xl px-4 py-3 border border-white/5">
                <div>
                  <div className="text-sm text-white font-medium">{e.users?.full_name}</div>
                  <div className="text-xs text-[#7b82a8]">{e.properties?.name} · Room {e.rooms?.room_number||'—'} · {formatCurrency(e.monthly_rent)}/mo</div>
                </div>
                <button onClick={()=>handleManualInvoice(e)} className="bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 text-xs font-semibold px-4 py-2 rounded-lg">+ Generate</button>
              </div>
            ))}
          </div>
        </div>
      )}

  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <select value={selectedProp} onChange={e=>{setSelectedProp(e.target.value);setLoading(true)}}
          className="bg-[#111527] border border-white/10 rounded-xl px-4 py-2 text-sm text-white">
          <option value="all">All Properties</option>
          {properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {['all','pending','paid','overdue'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${filter===f?'bg-brand-500 text-white':'bg-[#111527] text-[#7b82a8] border border-white/5'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full data-table text-sm">
            <thead><tr><th>Student</th><th>Property</th><th>Month</th><th>Rent</th><th>⚡</th><th>Late Fee</th><th>Total</th><th>Status</th><th>Due</th></tr></thead>
            <tbody>
              {loading ? [...Array(5)].map((_,i)=><tr key={i}>{[...Array(9)].map((_,j)=><td key={j} className="p-4"><div className="shimmer h-4 rounded"/></td>)}</tr>)
              : filtered.length > 0 ? filtered.map(inv=>(
                <tr key={inv.id}>
                  <td className="p-4"><div className="text-sm text-white">{inv.users?.full_name}</div><div className="text-xs text-[#7b82a8]">{inv.users?.email}</div></td>
                  <td className="p-4 text-[#7b82a8] text-sm">{inv.properties?.name}</td>
                  <td className="p-4 text-[#7b82a8] text-sm">{new Date(inv.billing_month).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</td>
                  <td className="p-4 text-white text-sm">{formatCurrency(inv.base_rent)}</td>
                  <td className="p-4 text-sm">{inv.electricity_amount>0?<span className="text-accent-gold">{formatCurrency(inv.electricity_amount)}</span>:'—'}</td>
                  <td className="p-4 text-sm">{inv.late_fee>0?<span className="text-accent-red">{formatCurrency(inv.late_fee)}</span>:'—'}</td>
                  <td className="p-4 text-white font-semibold text-sm">{formatCurrency(inv.total_amount)}</td>
                  <td className="p-4"><span className={`${statusBadgeClass(inv.status)} text-xs px-2 py-0.5 rounded-full capitalize`}>{inv.status}</span></td>
                  <td className="p-4 text-[#7b82a8] text-sm">{formatDate(inv.due_date)}</td>
                </tr>
              )) : <tr><td colSpan={9} className="p-8 text-center text-[#7b82a8]">No invoices found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}