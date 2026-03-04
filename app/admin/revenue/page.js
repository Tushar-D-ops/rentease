'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#4f6ef7', '#06d6a0', '#7c3aed', '#f5a623', '#ff4d6d']

export default function AdminRevenuePage() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading]   = useState(true)
  const [stats, setStats]       = useState({})
  const [charts, setCharts]     = useState({})
  const [page, setPage]         = useState(1)
  const PER_PAGE = 15

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)

    // payments table columns: id, invoice_id, student_id, amount, platform_fee, paid_at, status, razorpay_payment_id, type
    // NO property_id column — must join via invoice_id
    const { data: rawPayments, error } = await supabase
      .from('payments')
      .select('id, invoice_id, student_id, amount, platform_fee, paid_at, razorpay_payment_id')
      .eq('status', 'captured')
      .order('paid_at', { ascending: false })

    if (error) { console.error('Payments error:', error); setLoading(false); return }

    const pays = rawPayments || []

    // Fetch student names
    const studentIds = [...new Set(pays.map(p => p.student_id).filter(Boolean))]
    // Fetch invoices to get property_id
    const invoiceIds = [...new Set(pays.map(p => p.invoice_id).filter(Boolean))]

    const [{ data: students }, { data: invoices }, { data: invoiceStats }] = await Promise.all([
      studentIds.length > 0
        ? supabase.from('users').select('id, full_name, email').in('id', studentIds)
        : Promise.resolve({ data: [] }),
      invoiceIds.length > 0
        ? supabase.from('invoices').select('id, property_id').in('id', invoiceIds)
        : Promise.resolve({ data: [] }),
      supabase.from('invoices').select('status, total_amount'),
    ])

    // Get property names from invoice property_ids
    const propertyIds = [...new Set((invoices || []).map(i => i.property_id).filter(Boolean))]
    const { data: properties } = propertyIds.length > 0
      ? await supabase.from('properties').select('id, name, city').in('id', propertyIds)
      : { data: [] }

    // Build lookup maps
    const studentMap  = Object.fromEntries((students   || []).map(s => [s.id, s]))
    const invoiceMap  = Object.fromEntries((invoices   || []).map(i => [i.id, i]))
    const propertyMap = Object.fromEntries((properties || []).map(p => [p.id, p]))

    const enriched = pays.map(p => {
      const inv      = invoiceMap[p.invoice_id]
      const property = inv ? propertyMap[inv.property_id] : null
      return { ...p, student: studentMap[p.student_id], property }
    })

    // Stats — use actual amount values
    const totalRevenue    = enriched.reduce((s, p) => s + (p.amount || 0), 0)
    const platformRevenue = Math.floor(totalRevenue * 0.01)
    const avgTransaction  = enriched.length ? Math.floor(totalRevenue / enriched.length) : 0
    const pendingRevenue  = (invoiceStats || [])
      .filter(i => ['pending', 'overdue'].includes(i.status))
      .reduce((s, i) => s + (i.total_amount || 0), 0)

    // Revenue by month
    const byMonth = {}
    enriched.forEach(p => {
      if (!p.paid_at) return
      const m = p.paid_at.slice(0, 7)
      byMonth[m] = (byMonth[m] || 0) + (p.amount || 0)
    })
    const revenueChart = Object.entries(byMonth).slice(-6).map(([month, revenue]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      revenue,
      platformFee: Math.floor(revenue * 0.01),
    }))

    // Top properties by revenue
    const byProp = {}
    enriched.forEach(p => {
      const name = p.property?.name || 'Unknown'
      byProp[name] = (byProp[name] || 0) + (p.amount || 0)
    })
    const propChart = Object.entries(byProp)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, value]) => ({ name, value }))

    setPayments(enriched)
    setStats({ totalRevenue, platformRevenue, avgTransaction, pendingRevenue, totalTransactions: enriched.length })
    setCharts({ revenueChart, propChart })
    setLoading(false)
  }

  const paginated  = payments.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(payments.length / PER_PAGE)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="mb-6">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">Revenue</h1>
        <p className="text-[#7b82a8]">All transactions and platform earnings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        {[
          { icon: '💰', label: 'Total Collected',   value: formatCurrency(stats.totalRevenue || 0),    color: '#06d6a0' },
          { icon: '🏦', label: 'Platform Earnings', value: formatCurrency(stats.platformRevenue || 0), color: '#4f6ef7', sub: '1% commission' },
          { icon: '⏳', label: 'Pending Revenue',   value: formatCurrency(stats.pendingRevenue || 0),  color: '#f5a623' },
          { icon: '📊', label: 'Avg Transaction',   value: formatCurrency(stats.avgTransaction || 0),  color: '#7c3aed' },
          { icon: '🔢', label: 'Transactions',      value: stats.totalTransactions || 0,               color: '#06d6a0' },
        ].map(s => (
          <div key={s.label} className="bg-[#111527] border border-white/5 rounded-2xl p-4">
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="font-syne font-bold text-xl" style={{ color: s.color }}>{loading ? '—' : s.value}</div>
            <div className="text-[#7b82a8] text-xs">{s.label}</div>
            {s.sub && <div className="text-[#4a5070] text-xs">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-[#111527] border border-white/5 rounded-2xl p-5">
          <h2 className="font-syne font-bold text-white mb-4">Monthly Revenue vs Platform Earnings</h2>
          {charts.revenueChart?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" stroke="#7b82a8" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis stroke="#7b82a8" fontSize={11} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: '#111527', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}
                  formatter={(v, name) => [`₹${v.toLocaleString('en-IN')}`, name === 'revenue' ? 'Total Revenue' : 'Platform Fee']} />
                <Bar dataKey="revenue"     fill="#4f6ef7" radius={[4,4,0,0]} name="revenue" />
                <Bar dataKey="platformFee" fill="#06d6a0" radius={[4,4,0,0]} name="platformFee" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-[#7b82a8]">No data yet</div>
          )}
        </div>

        <div className="bg-[#111527] border border-white/5 rounded-2xl p-5">
          <h2 className="font-syne font-bold text-white mb-4">Top Properties</h2>
          {charts.propChart?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={charts.propChart} dataKey="value" cx="50%" cy="50%" outerRadius={55}>
                    {charts.propChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => formatCurrency(v)}
                    contentStyle={{ background: '#111527', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {charts.propChart.map((p, i) => (
                  <div key={p.name} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-[#7b82a8] truncate max-w-[110px]">{p.name}</span>
                    </div>
                    <span className="text-white font-medium">{formatCurrency(p.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-[#7b82a8]">No data yet</div>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-[#111527] border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h2 className="font-syne font-bold text-white">All Transactions ({payments.length})</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-[#7b82a8]">Loading...</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-[#7b82a8]">No transactions yet</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Date', 'Student', 'Property', 'Amount', 'Platform Fee', 'Payment ID'].map(h => (
                      <th key={h} className="p-4 text-left text-xs text-[#7b82a8] font-medium uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(pay => (
                    <tr key={pay.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                      <td className="p-4 text-[#7b82a8] text-xs whitespace-nowrap">{formatDate(pay.paid_at)}</td>
                      <td className="p-4">
                        <div className="text-white text-sm">{pay.student?.full_name || '—'}</div>
                        <div className="text-xs text-[#7b82a8]">{pay.student?.email}</div>
                      </td>
                      <td className="p-4 text-[#7b82a8] text-sm">{pay.property?.name || '—'}</td>
                      <td className="p-4 text-green-400 font-semibold">{formatCurrency(pay.amount)}</td>
                      <td className="p-4 text-brand-400">{formatCurrency(Math.floor((pay.amount || 0) * 0.01))}</td>
                      <td className="p-4 text-[#7b82a8] font-mono text-xs">
                        {pay.razorpay_payment_id ? pay.razorpay_payment_id.slice(0, 22) + '...' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="p-4 flex items-center justify-between border-t border-white/5">
                <div className="text-xs text-[#7b82a8]">
                  {((page-1)*PER_PAGE)+1}–{Math.min(page*PER_PAGE, payments.length)} of {payments.length}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                    className="px-3 py-1.5 text-sm bg-white/5 text-[#7b82a8] rounded-lg disabled:opacity-40 hover:text-white">← Prev</button>
                  <span className="px-3 py-1.5 text-sm text-white">{page}/{totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                    className="px-3 py-1.5 text-sm bg-white/5 text-[#7b82a8] rounded-lg disabled:opacity-40 hover:text-white">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}