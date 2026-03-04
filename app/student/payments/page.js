'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency, formatDate, statusBadgeClass } from '@/lib/utils'
import toast from 'react-hot-toast'

// ─────────────────────────────────────────────────────────────────────────────
// UPI PAYMENT CODE — commented out, preserved for future use
// ─────────────────────────────────────────────────────────────────────────────
// function buildUpiUrl({ upiId, name, amount, note }) {
//   const amountRupees = (amount / 100).toFixed(2)
//   return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amountRupees}&cu=INR&tn=${encodeURIComponent(note)}`
// }
// function buildQrUrl(upiUrl) {
//   return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiUrl)}&bgcolor=ffffff&color=0d1117&margin=12&ecc=M`
// }
// function buildAppLinks(upiUrl) {
//   return [
//     { name: 'GPay',    emoji: '🟢', link: `tez://upi/pay?${upiUrl.replace('upi://pay?','')}` },
//     { name: 'PhonePe', emoji: '🟣', link: `phonepe://pay?${upiUrl.replace('upi://pay?','')}` },
//     { name: 'Paytm',   emoji: '🔵', link: `paytmmp://pay?${upiUrl.replace('upi://pay?','')}` },
//     { name: 'Any UPI', emoji: '💳', link: upiUrl },
//   ]
// }
// ─────────────────────────────────────────────────────────────────────────────

export default function StudentPaymentsPage() {
  const { user }       = useUser()
  const searchParams   = useSearchParams()
  const [invoices, setInvoices]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [redirecting, setRedirecting]   = useState(null) // invoiceId being processed

  // Handle Stripe redirect back
  useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('success') === 'true') {
    toast.success('🎉 Payment successful! Invoice marked as paid.')
    window.history.replaceState({}, '', '/student/payments')
  }
  if (params.get('cancelled') === 'true') {
    toast.error('Payment cancelled. You can try again anytime.')
    window.history.replaceState({}, '', '/student/payments')
  }
}, [])

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    const { data: student } = await supabase
      .from('users').select('id').eq('clerk_id', user.id).maybeSingle()
    if (!student) { setLoading(false); return }

    const { data: inv } = await supabase
      .from('invoices')
      .select('*, properties!property_id(name, owner_id)')
      .eq('student_id', student.id)
      .order('billing_month', { ascending: false })

    setInvoices(inv || [])
    setLoading(false)
  }

  async function handlePayNow(invoice) {
    setRedirecting(invoice.id)
    try {
      const res = await fetch('/api/payments/create-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ invoiceId: invoice.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout')

      // Redirect to Stripe hosted checkout page
      window.location.href = data.url
    } catch (err) {
      toast.error(err.message || 'Payment failed to start')
      setRedirecting(null)
    }
  }

  const pendingInvoices = invoices.filter(i => ['pending', 'overdue'].includes(i.status))
  const paidInvoices    = invoices.filter(i => i.status === 'paid')

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">Payments</h1>
        <p className="text-[#7b82a8]">Manage your rent and electricity bill payments</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => <div key={i} className="shimmer h-48 rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* ── Pending Invoices ────────────────────────────────────── */}
          {pendingInvoices.length > 0 && (
            <div className="mb-8">
              <h2 className="font-syne font-bold text-lg text-white mb-4">⏳ Pending Payments</h2>
              <div className="space-y-4">
                {pendingInvoices.map(invoice => (
                  <div key={invoice.id} className="bg-[#111527] border border-accent-gold/20 rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="font-syne font-bold text-white text-lg">
                          {new Date(invoice.billing_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                        </div>
                        <span className={`${statusBadgeClass(invoice.status)} text-xs px-2 py-0.5 rounded-full mt-1 inline-block capitalize`}>
                          {invoice.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-syne font-bold text-2xl text-brand-400">
                          {formatCurrency(invoice.total_amount)}
                        </div>
                        <div className="text-xs text-[#7b82a8]">Due: {formatDate(invoice.due_date)}</div>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="bg-[#0b0f1e] rounded-xl p-4 mb-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#7b82a8]">Base Rent</span>
                        <span className="text-white">{formatCurrency(invoice.base_rent)}</span>
                      </div>
                      {invoice.electricity_amount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-[#7b82a8]">⚡ Electricity</span>
                          <span className="text-white">{formatCurrency(invoice.electricity_amount)}</span>
                        </div>
                      )}
                      {invoice.late_fee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-accent-red">⚠️ Late Fee</span>
                          <span className="text-accent-red">{formatCurrency(invoice.late_fee)}</span>
                        </div>
                      )}
                      <div className="border-t border-white/5 pt-2 flex justify-between font-semibold text-sm">
                        <span className="text-white">Total</span>
                        <span className="text-brand-400">{formatCurrency(invoice.total_amount)}</span>
                      </div>
                    </div>

                    {/* Pay with Stripe button */}
                    <button
                      onClick={() => handlePayNow(invoice)}
                      disabled={redirecting === invoice.id}
                      className="w-full bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
                    >
                      {redirecting === invoice.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Redirecting to Stripe...
                        </>
                      ) : (
                        '💳 Pay with Card'
                      )}
                    </button>

                    {/* Test mode hint */}
                    <p className="text-center text-xs text-[#4a5070] mt-2">
                      🧪 Test card: <span className="font-mono text-[#7b82a8]">4242 4242 4242 4242</span> · Any future date · Any CVC
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingInvoices.length === 0 && (
            <div className="bg-[#111527] border border-white/5 rounded-2xl p-8 text-center mb-8">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-accent-green font-semibold">All payments up to date!</div>
              <div className="text-[#7b82a8] text-sm mt-1">No pending invoices</div>
            </div>
          )}

          {/* ── Payment History ──────────────────────────────────────── */}
          {paidInvoices.length > 0 && (
            <div>
              <h2 className="font-syne font-bold text-lg text-white mb-4">✅ Payment History</h2>
              <div className="bg-[#111527] border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full data-table text-sm">
                  <thead>
                    <tr>
                      <th className="p-4 text-left text-[#7b82a8] font-medium">Month</th>
                      <th className="p-4 text-left text-[#7b82a8] font-medium">Rent</th>
                      <th className="p-4 text-left text-[#7b82a8] font-medium">Electricity</th>
                      <th className="p-4 text-left text-[#7b82a8] font-medium">Total</th>
                      <th className="p-4 text-left text-[#7b82a8] font-medium">Stripe ID</th>
                      <th className="p-4 text-left text-[#7b82a8] font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paidInvoices.map(inv => (
                      <tr key={inv.id} className="border-t border-white/5">
                        <td className="p-4 text-white">
                          {new Date(inv.billing_month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-4 text-[#7b82a8]">{formatCurrency(inv.base_rent)}</td>
                        <td className="p-4 text-[#7b82a8]">
                          {inv.electricity_amount > 0 ? formatCurrency(inv.electricity_amount) : '—'}
                        </td>
                        <td className="p-4 text-white font-semibold">{formatCurrency(inv.total_amount)}</td>
                        <td className="p-4 text-brand-400 font-mono text-xs">
                          {inv.stripe_payment_id
                            ? inv.stripe_payment_id.slice(0, 20) + '...'
                            : inv.razorpay_payment_id?.slice(0, 20) + '...' || '—'}
                        </td>
                        <td className="p-4">
                          <span className="bg-accent-green/10 text-accent-green text-xs px-2 py-0.5 rounded-full">
                            Paid ✓
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}