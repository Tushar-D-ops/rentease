'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function OwnerProfilePage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [profile, setProfile] = useState(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone]       = useState('')
  const [upiId, setUpiId]       = useState('')

  useEffect(() => {
    if (!user) return
    async function load() {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, phone, upi_id')
        .eq('clerk_id', user.id)
        .maybeSingle()
      if (data) {
        setProfile(data)
        setFullName(data.full_name || '')
        setPhone(data.phone || '')
        setUpiId(data.upi_id || '')
      }
      setLoading(false)
    }
    load()
  }, [user])

  async function handleSave() {
    if (!upiId) return toast.error('UPI ID is required so students can pay you')
    if (!upiId.includes('@')) return toast.error('Invalid UPI ID — example: yourname@ybl')
    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName, phone, upi_id: upiId.trim() })
        .eq('clerk_id', user.id)
      if (error) throw error
      toast.success('Profile saved!')
    } catch (err) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="max-w-xl mx-auto space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="shimmer h-14 rounded-xl" />)}
    </div>
  )

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">My Profile</h1>
        <p className="text-[#7b82a8]">Manage your account and payment settings</p>
      </div>

      {!upiId && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl flex-shrink-0">⚠️</span>
          <div>
            <div className="text-yellow-400 font-semibold text-sm">UPI ID not set</div>
            <div className="text-[#7b82a8] text-xs mt-0.5">Students cannot pay rent until you add your UPI ID</div>
          </div>
        </div>
      )}

      <div className="bg-[#111527] border border-white/5 rounded-2xl p-6 space-y-5">
        <div>
          <label className="text-xs text-[#7b82a8] uppercase tracking-wider mb-2 block">Full Name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)}
            className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070] outline-none focus:border-brand-500/50"
            placeholder="Your full name" />
        </div>

        <div>
          <label className="text-xs text-[#7b82a8] uppercase tracking-wider mb-2 block">Email</label>
          <input value={profile?.email || ''} disabled
            className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#4a5070] opacity-60 cursor-not-allowed" />
        </div>

        <div>
          <label className="text-xs text-[#7b82a8] uppercase tracking-wider mb-2 block">Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)}
            className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070] outline-none focus:border-brand-500/50"
            placeholder="+91 98765 43210" />
        </div>

        <div>
          <label className="text-xs text-[#7b82a8] uppercase tracking-wider mb-2 block">
            UPI ID <span className="text-accent-green ml-1 normal-case font-medium">★ Required for rent collection</span>
          </label>
          <div className="relative">
            <input value={upiId} onChange={e => setUpiId(e.target.value.trim())}
              className="w-full bg-[#0b0f1e] border border-brand-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070] outline-none focus:border-brand-500 pr-10"
              placeholder="yourname@ybl  or  9876543210@paytm" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">💸</span>
          </div>
          <p className="text-xs text-[#4a5070] mt-1.5">
            Find in: GPay → Profile → UPI ID · PhonePe → Profile · Paytm → Profile
          </p>
          {upiId && upiId.includes('@') && (
            <div className="mt-3 bg-accent-green/10 border border-accent-green/20 rounded-xl p-3 flex items-center gap-3">
              <span className="text-xl">✅</span>
              <div>
                <div className="text-accent-green text-sm font-semibold font-mono">{upiId}</div>
                <div className="text-[#7b82a8] text-xs">Students will pay rent to this UPI ID</div>
              </div>
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      <div className="bg-[#111527] border border-white/5 rounded-2xl p-6 mt-4">
        <h2 className="font-syne font-bold text-white mb-4">💡 How UPI Rent Collection Works</h2>
        <div className="space-y-3">
          {[
            ['📋', 'Invoice auto-generated on 1st — rent + electricity combined'],
            ['📲', 'Student taps "Pay Now" → UPI QR appears with exact amount pre-filled'],
            ['💳', 'Student scans QR or taps GPay/PhonePe button to pay you directly'],
            ['📸', 'Student uploads payment screenshot + transaction ID as proof'],
            ['✅', 'You confirm receipt → invoice marked paid in the system'],
            ['⚖️', 'Any dispute → Admin reviews screenshot + transaction ID as evidence'],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-start gap-3 text-sm text-[#7b82a8]">
              <span className="flex-shrink-0">{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}