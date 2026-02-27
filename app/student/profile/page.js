'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function StudentProfilePage() {
  const { user } = useUser()
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  // Form fields
  const [fullName, setFullName]         = useState('')
  const [phone, setPhone]               = useState('')
  const [collegeName, setCollegeName]   = useState('')
  const [collegeLat, setCollegeLat]     = useState('')
  const [collegeLng, setCollegeLng]     = useState('')

  // ─── Load profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    async function load() {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, phone, college_name, college_lat, college_lng')
        .eq('clerk_id', user.id)
        .maybeSingle()

      if (data) {
        setProfile(data)
        setFullName(data.full_name || '')
        setPhone(data.phone || '')
        setCollegeName(data.college_name || '')
        setCollegeLat(data.college_lat?.toString() || '')
        setCollegeLng(data.college_lng?.toString() || '')
      }
      setLoading(false)
    }
    load()
  }, [user])

  // ─── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!collegeLat || !collegeLng) return toast.error('Please enter your college latitude and longitude')

    const lat = parseFloat(collegeLat)
    const lng = parseFloat(collegeLng)

    if (isNaN(lat) || isNaN(lng)) return toast.error('Coordinates must be numbers')
    if (lat < -90 || lat > 90)    return toast.error('Latitude must be between -90 and 90')
    if (lng < -180 || lng > 180)  return toast.error('Longitude must be between -180 and 180')

    setSaving(true)
    try {
      const res = await fetch('/api/users/update-college', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:   fullName,
          phone:       phone,
          college_name: collegeName,
          college_lat:  lat,
          college_lng:  lng,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setProfile(data.user)
      toast.success('Profile saved! Nearby PGs will now filter correctly ✅')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const hasCoords = profile?.college_lat && profile?.college_lng

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="shimmer h-8 w-48 rounded-xl" />
        <div className="shimmer h-96 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">My Profile</h1>
        <p className="text-[#7b82a8]">Update your details and college location</p>
      </div>

      {/* Status banner */}
      {!hasCoords ? (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <div className="text-yellow-400 font-semibold text-sm">College location not set</div>
            <p className="text-[#7b82a8] text-xs mt-1">
              Enter your college latitude and longitude below. Without this, we can't filter nearby PGs for you.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-accent-green/10 border border-accent-green/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-2xl">📍</span>
          <div>
            <div className="text-accent-green font-semibold text-sm">College location is set</div>
            <p className="text-[#7b82a8] text-xs mt-1">
              Lat: <span className="text-white">{profile.college_lat}</span> &nbsp;|&nbsp;
              Lng: <span className="text-white">{profile.college_lng}</span>
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-[#111527] border border-white/5 rounded-2xl p-6 space-y-5">

        {/* Full Name */}
        <div>
          <label className="block text-sm text-[#7b82a8] mb-2">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Your full name"
            className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070] focus:border-brand-500/50 outline-none"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm text-[#7b82a8] mb-2">Email</label>
          <input
            type="email"
            value={profile?.email || ''}
            disabled
            className="w-full bg-[#0b0f1e] border border-white/5 rounded-xl px-4 py-3 text-sm text-[#4a5070] cursor-not-allowed"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm text-[#7b82a8] mb-2">Phone (optional)</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+91 9876543210"
            className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070] focus:border-brand-500/50 outline-none"
          />
        </div>

        <div className="border-t border-white/5 pt-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold text-sm">College Location</h3>
              <p className="text-[#7b82a8] text-xs mt-0.5">Used to show only nearby PGs</p>
            </div>
            {/* Helper link to get coords */}
            <a
              href="https://www.google.com/maps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2"
            >
              Get coords from Google Maps →
            </a>
          </div>

          {/* College Name */}
          <div className="mb-4">
            <label className="block text-sm text-[#7b82a8] mb-2">College Name (optional)</label>
            <input
              type="text"
              value={collegeName}
              onChange={e => setCollegeName(e.target.value)}
              placeholder="e.g. NIT Nagpur"
              className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070] focus:border-brand-500/50 outline-none"
            />
          </div>

          {/* Lat / Lng side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[#7b82a8] mb-2">
                Latitude <span className="text-brand-400">*</span>
              </label>
              <input
                type="number"
                step="any"
                value={collegeLat}
                onChange={e => setCollegeLat(e.target.value)}
                placeholder="e.g. 21.1458"
                className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070] focus:border-brand-500/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-[#7b82a8] mb-2">
                Longitude <span className="text-brand-400">*</span>
              </label>
              <input
                type="number"
                step="any"
                value={collegeLng}
                onChange={e => setCollegeLng(e.target.value)}
                placeholder="e.g. 79.0882"
                className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070] focus:border-brand-500/50 outline-none"
              />
            </div>
          </div>

          {/* How to get coords helper */}
          <div className="mt-3 bg-white/3 border border-white/5 rounded-xl p-3">
            <p className="text-[#7b82a8] text-xs leading-relaxed">
              <span className="text-white font-medium">How to get coordinates:</span> Open{' '}
              <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">
                Google Maps
              </a>
              , search your college, right-click on it → the first two numbers shown are your latitude and longitude.
            </p>
          </div>
        </div>

        {/* Save */}
        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !collegeLat || !collegeLng}
            className="w-full bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {saving ? '⏳ Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-4 flex gap-3 flex-wrap">
        <Link href="/student/properties"
          className="bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          🔍 Find PGs
        </Link>
        <Link href="/student"
          className="bg-white/5 text-white hover:bg-white/10 text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          🏠 Dashboard
        </Link>
      </div>
    </div>
  )
}