'use client'
import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import toast from 'react-hot-toast'

export default function OnboardingPage() {
  const { user, isLoaded } = useUser()
  const [selectedRole, setSelectedRole]     = useState(null)
  const [college, setCollege]               = useState('')
  const [phone, setPhone]                   = useState('')
  const [loading, setLoading]               = useState(false)
  const [checking, setChecking]             = useState(true)
  const [geocoding, setGeocoding]           = useState(false)
  const [collegePreview, setCollegePreview] = useState(null) // { name, lat, lng }
  const [geocodeError, setGeocodeError]     = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!user) { setChecking(false); return }
    fetch('/api/users/me')
      .then(r => r.json())
      .then(data => {
        if (data?.role) window.location.href = `/${data.role}`
        else setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [isLoaded, user])

  // ✅ Live geocode preview as student types (debounced)
  useEffect(() => {
    if (selectedRole !== 'student' || !college || college.length < 5) {
      setCollegePreview(null)
      setGeocodeError(false)
      return
    }
    const timer = setTimeout(async () => {
      setGeocoding(true)
      setGeocodeError(false)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(college + ', India')}&format=json&limit=1`,
          { headers: { 'User-Agent': 'RentEase/1.0' } }
        )
        const data = await res.json()
        if (data.length > 0) {
          setCollegePreview({
            name: data[0].display_name,
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          })
        } else {
          setCollegePreview(null)
          setGeocodeError(true)
        }
      } catch {
        setCollegePreview(null)
      } finally {
        setGeocoding(false)
      }
    }, 800) // debounce 800ms
    return () => clearTimeout(timer)
  }, [college, selectedRole])

  async function handleSubmit() {
    if (!selectedRole) return toast.error('Please select your role')
    if (selectedRole === 'student' && !college)
      return toast.error('Please enter your college name')
    if (selectedRole === 'student' && !collegePreview)
      return toast.error('Could not locate your college. Please check the name and try again.')

    setLoading(true)
    try {
      const res = await fetch('/api/users/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole, college, phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Onboarding failed')
      toast.success('Welcome to RentEase! 🎉')
      window.location.href = `/${selectedRole}`
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <div className="text-white text-lg animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
  <div className="min-h-screen mesh-bg flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
    <div className="w-full max-w-md sm:max-w-lg">

      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center text-2xl sm:text-3xl mx-auto mb-4">
          🏠
        </div>
        <h1 className="font-syne font-bold text-2xl sm:text-3xl lg:text-4xl text-white">
          Welcome to RentEase
        </h1>
        <p className="text-sm sm:text-base text-[#7b82a8] mt-2">
          Let's set up your account
        </p>
      </div>

      {/* Card */}
      <div className="bg-[#111527] border border-white/5 rounded-2xl p-5 sm:p-8">
        <h2 className="font-semibold text-white text-base sm:text-lg mb-4">
          I am a...
        </h2>

        {/* Role Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {[
            { role: 'student', icon: '🎓', label: 'Student', desc: 'Looking for accommodation' },
            { role: 'owner',   icon: '🏢', label: 'Owner',   desc: 'Managing properties'      },
          ].map((opt) => (
            <button
              key={opt.role}
              onClick={() => setSelectedRole(opt.role)}
              className={`p-4 sm:p-5 rounded-xl border-2 text-left transition-all w-full ${
                selectedRole === opt.role
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <div className="text-2xl sm:text-3xl mb-2">{opt.icon}</div>
              <div className="font-semibold text-white text-sm sm:text-base">
                {opt.label}
              </div>
              <div className="text-[#7b82a8] text-xs sm:text-sm mt-0.5">
                {opt.desc}
              </div>
            </button>
          ))}
        </div>

        {/* Student College Field */}
        {selectedRole === 'student' && (
          <div className="mb-5">
            <label className="block text-sm text-[#7b82a8] mb-2">
              College / University *
            </label>
            <input
              type="text"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              placeholder="e.g. NIT Nagpur, Pune University"
              className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm sm:text-base text-white placeholder:text-[#4a5070]"
            />

            {/* Live Geocode Feedback */}
            <div className="mt-2 min-h-[48px]">
              {geocoding && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-[#7b82a8]">
                  <span className="animate-spin">⏳</span> Locating your college...
                </div>
              )}

              {!geocoding && collegePreview && (
                <div className="flex items-start gap-2 bg-accent-green/10 border border-accent-green/30 rounded-lg px-3 py-2">
                  <span className="text-accent-green text-sm mt-0.5">✓</span>
                  <div>
                    <div className="text-accent-green text-xs sm:text-sm font-semibold">
                      College located!
                    </div>
                    <div className="text-[#7b82a8] text-xs sm:text-sm mt-0.5 line-clamp-2">
                      {collegePreview.name}
                    </div>
                  </div>
                </div>
              )}

              {!geocoding && geocodeError && college.length >= 5 && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <span className="text-red-400 text-sm">✗</span>
                  <div className="text-red-400 text-xs sm:text-sm">
                    Couldn't find this college. Try the full name, e.g.
                    "Visvesvaraya National Institute of Technology Nagpur"
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Phone Field */}
        {selectedRole && (
          <div className="mb-6">
            <label className="block text-sm text-[#7b82a8] mb-2">
              Phone (optional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9876543210"
              className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm sm:text-base text-white placeholder:text-[#4a5070]"
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={
            loading ||
            !selectedRole ||
            (selectedRole === 'student' &&
              (!college || geocoding || !collegePreview))
          }
          className="w-full bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold py-3 sm:py-3.5 rounded-xl text-sm sm:text-base hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {loading ? '⏳ Setting up...' : 'Complete Setup →'}
        </button>

        {/* Validation Message */}
        {selectedRole === 'student' &&
          college &&
          !collegePreview &&
          !geocoding && (
            <p className="text-[#7b82a8] text-xs sm:text-sm text-center mt-3">
              College location is required to show you nearby PGs
            </p>
          )}
      </div>
    </div>
  </div>
)
}