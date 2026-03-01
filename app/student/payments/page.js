'use client'
import { useEffect, useState, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency, formatDate, statusBadgeClass } from '@/lib/utils'
import toast from 'react-hot-toast'

// Build UPI deep link URL — works with all UPI apps
function buildUpiUrl({ upiId, name, amount, note }) {
  const amountRupees = (amount / 100).toFixed(2)
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amountRupees}&cu=INR&tn=${encodeURIComponent(note)}`
}

// Build QR image URL using free QR API (no API key needed)
function buildQrUrl(upiUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiUrl)}&bgcolor=ffffff&color=0d1117&margin=12&ecc=M`
}

// UPI app deep links (open specific apps directly)
function buildAppLinks(upiUrl) {
  const encoded = encodeURIComponent(upiUrl)
  return [
    { name: 'GPay',     emoji: '🟢', color: '#34A853', link: `tez://upi/pay?${upiUrl.replace('upi://pay?','')}` },
    { name: 'PhonePe',  emoji: '🟣', color: '#5F259F', link: `phonepe://pay?${upiUrl.replace('upi://pay?','')}` },
    { name: 'Paytm',    emoji: '🔵', color: '#00BAF2', link: `paytmmp://pay?${upiUrl.replace('upi://pay?','')}` },
    { name: 'Any UPI',  emoji: '💳', color: '#4f6ef7', link: upiUrl },
  ]
}

export default function StudentPaymentsPage() {
  const { user } = useUser()
  const [invoices, setInvoices]             = useState([])
  const [loading, setLoading]               = useState(true)
  const [payingInvoice, setPayingInvoice]   = useState(null)
  const [ownerUpi, setOwnerUpi]             = useState(null)
  const [loadingUpi, setLoadingUpi]         = useState(false)
  // Steps: 'qr' → show QR | 'proof' → upload screenshot
  const [step, setStep]                     = useState('qr')
  const [txnId, setTxnId]                   = useState('')
  const [screenshot, setScreenshot]         = useState(null)
  const [preview, setPreview]               = useState(null)
  const [submitting, setSubmitting]         = useState(false)
  const fileRef = useRef(null)

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

  async function openModal(invoice) {
    setPayingInvoice(invoice)
    setStep('qr')
    setTxnId('')
    setScreenshot(null)
    setPreview(null)
    setOwnerUpi(null)
    setLoadingUpi(true)

    // Fetch owner's UPI ID
    const ownerId = invoice.properties?.owner_id
    if (ownerId) {
      const { data: owner } = await supabase
        .from('users')
        .select('upi_id, full_name')
        .eq('id', ownerId)
        .maybeSingle()
      setOwnerUpi(owner)
    }
    setLoadingUpi(false)
  }

  function closeModal() {
    setPayingInvoice(null)
    setOwnerUpi(null)
    setStep('qr')
    setTxnId('')
    setScreenshot(null)
    setPreview(null)
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Please upload an image')
    if (file.size > 5 * 1024 * 1024) return toast.error('Max file size is 5MB')
    setScreenshot(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleSubmitProof() {
    if (!screenshot) return toast.error('Please upload your payment screenshot')
    if (!txnId.trim()) return toast.error('Please enter your UPI Transaction ID')
    setSubmitting(true)

    try {
      // Upload screenshot to Supabase Storage bucket "payment-proofs"
      const ext  = screenshot.name.split('.').pop()
      const path = `${payingInvoice.id}/${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('payment-proofs')
        .upload(path, screenshot, { contentType: screenshot.type, upsert: true })

      if (uploadErr) throw new Error('Screenshot upload failed: ' + uploadErr.message)

      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs').getPublicUrl(path)

      // Save proof to invoice + mark as under_review
      const { error: updateErr } = await supabase
        .from('invoices')
        .update({
          status:            'under_review',
          payment_proof_url: publicUrl,
          upi_txn_id:        txnId.trim(),
        })
        .eq('id', payingInvoice.id)

      if (updateErr) throw new Error(updateErr.message)

      toast.success('Payment proof submitted! Owner will verify and confirm.')
      closeModal()
      fetchData()
    } catch (err) {
      toast.error(err.message || 'Failed to submit proof')
    } finally {
      setSubmitting(false)
    }
  }

  const pendingInvoices = invoices.filter(i => ['pending', 'overdue'].includes(i.status))
  const reviewInvoices  = invoices.filter(i => i.status === 'under_review')
  const paidInvoices    = invoices.filter(i => i.status === 'paid')

  // Build UPI payment data for modal
  const monthLabel = payingInvoice
    ? new Date(payingInvoice.billing_month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : ''
  const upiUrl = payingInvoice && ownerUpi?.upi_id
    ? buildUpiUrl({ upiId: ownerUpi.upi_id, name: ownerUpi.full_name || 'PG Owner', amount: payingInvoice.total_amount, note: `Rent ${monthLabel}` })
    : null
  const qrImageUrl = upiUrl ? buildQrUrl(upiUrl) : null
  const appLinks   = upiUrl ? buildAppLinks(upiUrl) : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">Payments</h1>
        <p className="text-[#7b82a8]">Manage your rent and electricity bill payments</p>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(2)].map((_, i) => <div key={i} className="shimmer h-48 rounded-2xl" />)}</div>
      ) : (
        <>
          {/* ── Under Review ─────────────────────────────────────────── */}
          {reviewInvoices.map(invoice => (
            <div key={invoice.id} className="bg-[#111527] border border-brand-500/30 rounded-2xl p-5 mb-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-xl flex-shrink-0 animate-pulse">⏳</div>
              <div className="flex-1">
                <div className="text-white font-semibold">
                  {new Date(invoice.billing_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} — {formatCurrency(invoice.total_amount)}
                </div>
                <div className="text-[#7b82a8] text-sm">Payment proof submitted · Waiting for owner confirmation</div>
                {invoice.upi_txn_id && (
                  <div className="text-xs text-brand-400 font-mono mt-1">Txn ID: {invoice.upi_txn_id}</div>
                )}
              </div>
            </div>
          ))}

          {/* ── Pending Invoices ─────────────────────────────────────── */}
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
                        <div className="font-syne font-bold text-2xl text-brand-400">{formatCurrency(invoice.total_amount)}</div>
                        <div className="text-xs text-[#7b82a8]">Due: {formatDate(invoice.due_date)}</div>
                      </div>
                    </div>
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
                    <button onClick={() => openModal(invoice)}
                      className="w-full bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold py-3 rounded-xl hover:opacity-90">
                      💳 Pay via UPI
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingInvoices.length === 0 && reviewInvoices.length === 0 && (
            <div className="bg-[#111527] border border-white/5 rounded-2xl p-8 text-center mb-8">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-accent-green font-semibold">All payments up to date!</div>
              <div className="text-[#7b82a8] text-sm mt-1">No pending invoices</div>
            </div>
          )}

          {/* ── Payment History ───────────────────────────────────────── */}
          {paidInvoices.length > 0 && (
            <div>
              <h2 className="font-syne font-bold text-lg text-white mb-4">✅ Payment History</h2>
              <div className="bg-[#111527] border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full data-table text-sm">
                  <thead><tr><th>Month</th><th>Rent</th><th>Electricity</th><th>Total</th><th>Txn ID</th><th>Status</th></tr></thead>
                  <tbody>
                    {paidInvoices.map(inv => (
                      <tr key={inv.id}>
                        <td className="p-4 text-white">
                          {new Date(inv.billing_month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-4 text-[#7b82a8]">{formatCurrency(inv.base_rent)}</td>
                        <td className="p-4 text-[#7b82a8]">{inv.electricity_amount > 0 ? formatCurrency(inv.electricity_amount) : '—'}</td>
                        <td className="p-4 text-white font-semibold">{formatCurrency(inv.total_amount)}</td>
                        <td className="p-4 text-brand-400 font-mono text-xs">{inv.upi_txn_id || '—'}</td>
                        <td className="p-4"><span className="badge-success text-xs px-2 py-0.5 rounded-full">Paid ✓</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PAYMENT MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {payingInvoice && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111527] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">

            {/* Modal header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#111527] z-10">
              <div>
                <div className="font-syne font-bold text-white">Pay Rent</div>
                <div className="text-[#7b82a8] text-xs">{monthLabel} · {formatCurrency(payingInvoice.total_amount)}</div>
              </div>
              <button onClick={closeModal}
                className="text-[#7b82a8] hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-lg">
                ✕
              </button>
            </div>

            {/* ── Step 1: QR ─────────────────────────────────────────── */}
            {step === 'qr' && (
              <div className="p-5">
                {loadingUpi ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <div className="text-[#7b82a8] text-sm">Loading payment details...</div>
                  </div>
                ) : !ownerUpi?.upi_id ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">⚠️</div>
                    <div className="text-white font-semibold mb-2">Owner hasn't set up UPI</div>
                    <div className="text-[#7b82a8] text-sm">Contact your owner to add their UPI ID</div>
                  </div>
                ) : (
                  <>
                    {/* Amount banner */}
                    <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4 mb-5 text-center">
                      <div className="text-[#7b82a8] text-xs mb-1">Pay exactly</div>
                      <div className="font-syne font-bold text-3xl text-brand-400">{formatCurrency(payingInvoice.total_amount)}</div>
                      <div className="text-[#7b82a8] text-xs mt-1">to {ownerUpi.full_name || 'PG Owner'} · {ownerUpi.upi_id}</div>
                    </div>

                    {/* QR Code */}
                    <div className="flex justify-center mb-5">
                      <div className="bg-white p-3 rounded-2xl shadow-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qrImageUrl}
                          alt="UPI Payment QR"
                          width={220}
                          height={220}
                          className="block"
                        />
                      </div>
                    </div>
                    <p className="text-center text-xs text-[#7b82a8] mb-5">
                      Scan with any UPI app · Amount is pre-filled
                    </p>

                    {/* UPI App deep links */}
                    <div className="grid grid-cols-4 gap-2 mb-5">
                      {appLinks.map(app => (
                        <a key={app.name} href={app.link}
                          className="flex flex-col items-center gap-1.5 bg-[#0b0f1e] border border-white/10 rounded-xl py-3 hover:border-white/30 transition-colors">
                          <span className="text-xl">{app.emoji}</span>
                          <span className="text-xs text-[#7b82a8]">{app.name}</span>
                        </a>
                      ))}
                    </div>

                    {/* Breakdown */}
                    <div className="bg-[#0b0f1e] rounded-xl p-3 mb-5 space-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-[#7b82a8]">Base Rent</span><span className="text-white">{formatCurrency(payingInvoice.base_rent)}</span></div>
                      {payingInvoice.electricity_amount > 0 && <div className="flex justify-between"><span className="text-[#7b82a8]">⚡ Electricity</span><span className="text-white">{formatCurrency(payingInvoice.electricity_amount)}</span></div>}
                      {payingInvoice.late_fee > 0 && <div className="flex justify-between"><span className="text-accent-red">⚠️ Late Fee</span><span className="text-accent-red">{formatCurrency(payingInvoice.late_fee)}</span></div>}
                      <div className="border-t border-white/5 pt-1.5 flex justify-between font-semibold"><span className="text-white">Total</span><span className="text-brand-400">{formatCurrency(payingInvoice.total_amount)}</span></div>
                    </div>

                    <button onClick={() => setStep('proof')}
                      className="w-full bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold py-3 rounded-xl hover:opacity-90">
                      ✅ I've Paid — Upload Proof
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── Step 2: Upload Proof ───────────────────────────────── */}
            {step === 'proof' && (
              <div className="p-5">
                <button onClick={() => setStep('qr')} className="text-brand-400 text-sm mb-5 flex items-center gap-1 hover:text-brand-300">
                  ← Back to QR
                </button>

                <h3 className="font-syne font-bold text-white mb-1">Upload Payment Proof</h3>
                <p className="text-[#7b82a8] text-xs mb-5">
                  Share your UPI screenshot and transaction ID. This creates a verifiable record — fake screenshots can be challenged via your bank's transaction history.
                </p>

                {/* Transaction ID */}
                <div className="mb-4">
                  <label className="text-xs text-[#7b82a8] uppercase tracking-wider mb-2 block">
                    UPI Transaction ID <span className="text-accent-red">*</span>
                  </label>
                  <input value={txnId} onChange={e => setTxnId(e.target.value)}
                    placeholder="e.g. 405938475029384756"
                    className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-[#4a5070] outline-none focus:border-brand-500/50" />
                  <p className="text-xs text-[#4a5070] mt-1">
                    Find in GPay → Transaction details · PhonePe → History · Bank SMS
                  </p>
                </div>

                {/* Screenshot upload */}
                <div className="mb-5">
                  <label className="text-xs text-[#7b82a8] uppercase tracking-wider mb-2 block">
                    Payment Screenshot <span className="text-accent-red">*</span>
                  </label>

                  {preview ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt="Screenshot preview" className="w-full rounded-xl border border-white/10 max-h-48 object-cover" />
                      <button onClick={() => { setScreenshot(null); setPreview(null) }}
                        className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => fileRef.current?.click()}
                      className="w-full border-2 border-dashed border-white/10 rounded-xl py-8 flex flex-col items-center gap-2 hover:border-brand-500/40 transition-colors">
                      <span className="text-3xl">📸</span>
                      <span className="text-sm text-[#7b82a8]">Tap to upload screenshot</span>
                      <span className="text-xs text-[#4a5070]">JPG, PNG · Max 5MB</span>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </div>

                {/* Anti-fraud notice */}
                <div className="bg-[#0b0f1e] border border-white/5 rounded-xl p-3 mb-5 flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">🔒</span>
                  <p className="text-xs text-[#7b82a8] leading-relaxed">
                    Your transaction ID is recorded with a timestamp. If the owner incorrectly denies your payment, you can raise a dispute — admins will verify using your bank statement.
                  </p>
                </div>

                <button onClick={handleSubmitProof} disabled={submitting || !screenshot || !txnId.trim()}
                  className="w-full bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>
                  ) : '📤 Submit Payment Proof'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}