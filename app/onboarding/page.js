'use client'
import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function OnboardingPage() {
  const { user } = useUser()
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState(null)
  const [college, setCollege] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

//   async function handleSubmit() {
//     if (!selectedRole) return toast.error('Please select your role')
//     if (selectedRole === 'student' && !college) return toast.error('Please enter your college name')
//     setLoading(true)
//     try {
//       const res = await fetch('/api/users/onboard', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ role: selectedRole, college, phone }),
//       })
//       if (!res.ok) throw new Error('Onboarding failed')
//       await user.update({ publicMetadata: { role: selectedRole } })
//       toast.success('Welcome to RentEase! 🎉')
//       router.push(`/${selectedRole}`)
//     } catch { toast.error('Something went wrong. Please try again.') }
//     finally { setLoading(false) }
//   }

  async function handleSubmit() {
  if (!selectedRole) return toast.error('Please select your role')
  if (selectedRole === 'student' && !college)
    return toast.error('Please enter your college name')

  setLoading(true)

  try {
    const res = await fetch('/api/users/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: selectedRole, college, phone }),
    })

    if (!res.ok) throw new Error('Onboarding failed')

    toast.success('Welcome to RentEase! 🎉')
    router.push(`/${selectedRole}`)
  } catch {
    toast.error('Something went wrong. Please try again.')
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center text-3xl mx-auto mb-4">🏠</div>
          <h1 className="font-syne font-bold text-3xl text-white">Welcome to RentEase</h1>
          <p className="text-[#7b82a8] mt-2">Let's set up your account</p>
        </div>
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-8">
          <h2 className="font-semibold text-white mb-4">I am a...</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { role:'student', icon:'🎓', label:'Student', desc:'Looking for accommodation' },
              { role:'owner',   icon:'🏢', label:'Owner',   desc:'Managing properties'      },
            ].map((opt) => (
              <button key={opt.role} onClick={() => setSelectedRole(opt.role)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${selectedRole===opt.role?'border-brand-500 bg-brand-500/10':'border-white/10 hover:border-white/20 bg-white/5'}`}>
                <div className="text-2xl mb-2">{opt.icon}</div>
                <div className="font-semibold text-white text-sm">{opt.label}</div>
                <div className="text-[#7b82a8] text-xs mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
          {selectedRole === 'student' && (
            <div className="mb-4">
              <label className="block text-sm text-[#7b82a8] mb-2">College / University *</label>
              <input type="text" value={college} onChange={(e)=>setCollege(e.target.value)} placeholder="e.g. NIT Nagpur"
                className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070]" />
            </div>
          )}
          {selectedRole && (
            <div className="mb-6">
              <label className="block text-sm text-[#7b82a8] mb-2">Phone (optional)</label>
              <input type="tel" value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+91 9876543210"
                className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070]" />
            </div>
          )}
          <button onClick={handleSubmit} disabled={loading||!selectedRole}
            className="w-full bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-40">
            {loading ? '⏳ Setting up...' : 'Complete Setup →'}
          </button>
        </div>
      </div>
    </div>
  )
}