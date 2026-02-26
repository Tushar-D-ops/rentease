'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency, formatDate, statusBadgeClass } from '@/lib/utils'
import toast from 'react-hot-toast'
import Script from 'next/script'

export default function StudentPaymentsPage() {
  const { user } = useUser()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(null)

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    const { data: student } = await supabase.from('users').select('id').eq('clerk_id', user.id).single()
    if (!student) { setLoading(false); return }
    const { data: inv } = await supabase.from('invoices').select('*').eq('student_id', student.id).order('billing_month', { ascending: false })
    setInvoices(inv || [])
    setLoading(false)
  }

  async function handlePay(invoice) {
    setPaying(invoice.id)
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id }),
      })
      const { orderId, amount } = await res.json()
      if (!orderId) throw new Error('Failed to create order')
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount, currency: 'INR', order_id: orderId,
        name: 'RentEase', description: `Rent - ${invoice.billing_month}`,
        handler: async () => { toast.success('Payment successful! 🎉'); fetchData() },
        prefill: { name: user.fullName, email: user.primaryEmailAddress?.emailAddress },
        theme: { color: '#4f6ef7' },
        modal: { ondismiss: () => setPaying(null) },
      }
      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', () => { toast.error('Payment failed.'); setPaying(null) })
      rzp.open()
    } catch { toast.error('Failed to initiate payment'); setPaying(null) }
  }

  const pendingInvoices = invoices.filter((i) => ['pending','overdue'].includes(i.status))
  const paidInvoices    = invoices.filter((i) => i.status === 'paid')

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div>
        <div className="mb-8">
          <h1 className="font-syne font-bold text-3xl text-white mb-1">Payments</h1>
          <p className="text-[#7b82a8]">Manage your rent and electricity bill payments</p>
        </div>

        {pendingInvoices.length > 0 && (
          <div className="mb-8">
            <h2 className="font-syne font-bold text-lg text-white mb-4">⏳ Pending Payments</h2>
            <div className="space-y-4">
              {pendingInvoices.map((invoice) => (
                <div key={invoice.id} className="bg-[#111527] border border-accent-gold/20 rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-syne font-bold text-white text-lg">
                        {new Date(invoice.billing_month).toLocaleDateString('en-IN',{month:'long',year:'numeric'})}
                      </div>
                      <span className={`${statusBadgeClass(invoice.status)} text-xs px-2 py-0.5 rounded-full mt-1 inline-block capitalize`}>{invoice.status}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-syne font-bold text-2xl text-brand-400">{formatCurrency(invoice.total_amount)}</div>
                      <div className="text-xs text-[#7b82a8]">Due: {formatDate(invoice.due_date)}</div>
                    </div>
                  </div>
                  <div className="bg-[#0b0f1e] rounded-xl p-4 mb-4 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-[#7b82a8]">Base Rent</span><span className="text-white">{formatCurrency(invoice.base_rent)}</span></div>
                    {invoice.electricity_amount>0 && <div className="flex justify-between text-sm"><span className="text-[#7b82a8]">⚡ Electricity</span><span className="text-white">{formatCurrency(invoice.electricity_amount)}</span></div>}
                    {invoice.late_fee>0 && <div className="flex justify-between text-sm"><span className="text-accent-red">⚠️ Late Fee</span><span className="text-accent-red">{formatCurrency(invoice.late_fee)}</span></div>}
                  </div>
                  <button onClick={() => handlePay(invoice)} disabled={paying===invoice.id}
                    className="w-full bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-50">
                    {paying===invoice.id ? '⏳ Opening payment...' : `Pay ${formatCurrency(invoice.total_amount)} →`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-[#111527] border border-white/5 rounded-2xl">
          <div className="p-6 border-b border-white/5">
            <h2 className="font-syne font-bold text-lg text-white">Payment History</h2>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="shimmer h-14 rounded-xl" />)}</div>
          ) : paidInvoices.length > 0 ? (
            <div className="divide-y divide-white/5">
              {paidInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center">✅</div>
                    <div>
                      <div className="font-medium text-white">{new Date(invoice.billing_month).toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</div>
                      <div className="text-xs text-[#7b82a8]">Paid on {formatDate(invoice.paid_at)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-syne font-bold text-accent-green">{formatCurrency(invoice.total_amount)}</div>
                    <span className="badge-success text-xs px-2 py-0.5 rounded-full">Paid</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-[#7b82a8]">No payment history yet</div>
          )}
        </div>
      </div>
    </>
  )
}