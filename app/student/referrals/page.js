'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function ReferralsPage() {
  const { user } = useUser()
  const [data, setData] = useState({ code: '', referrals: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    const { data: student } = await supabase.from('users').select('id,referral_code').eq('clerk_id',user.id).single()
    if (!student) { setLoading(false); return }
    const { data: referrals } = await supabase.from('referrals').select('*,users!referred_id(full_name,email)').eq('referrer_id',student.id).order('created_at',{ascending:false})
    setData({ code: student.referral_code, referrals: referrals||[] })
    setLoading(false)
  }

  function copyCode() {
    navigator.clipboard.writeText(data.code)
    toast.success('Referral code copied!')
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/sign-up?ref=${data.code}`)
    toast.success('Referral link copied!')
  }

  const credited = data.referrals.filter(r=>r.status==='credited').length
  const pending  = data.referrals.filter(r=>r.status==='pending').length

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">Referrals</h1>
        <p className="text-[#7b82a8]">Refer friends and earn cashback</p>
      </div>

      {/* Rewards info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-brand-500/20 to-accent-purple/20 border border-brand-500/30 rounded-2xl p-6">
          <div className="text-3xl mb-3">🎁</div>
          <div className="font-syne font-bold text-white text-xl mb-1">You Earn ₹500</div>
          <div className="text-[#7b82a8] text-sm">For every friend who successfully enrolls using your code</div>
        </div>
        <div className="bg-gradient-to-br from-accent-green/20 to-brand-500/20 border border-accent-green/30 rounded-2xl p-6">
          <div className="text-3xl mb-3">👥</div>
          <div className="font-syne font-bold text-white text-xl mb-1">Friend Gets ₹300</div>
          <div className="text-[#7b82a8] text-sm">Discount on their first month's rent when they use your code</div>
        </div>
      </div>

      {/* Referral code */}
      <div className="bg-[#111527] border border-white/5 rounded-2xl p-6 mb-8">
        <h2 className="font-syne font-bold text-lg text-white mb-4">Your Referral Code</h2>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3">
            <span className="font-mono font-bold text-brand-400 text-xl tracking-widest">{data.code || '...'}</span>
          </div>
          <button onClick={copyCode} className="bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 font-semibold px-4 py-3 rounded-xl transition-colors">Copy Code</button>
        </div>
        <button onClick={copyLink} className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-colors">
          🔗 Copy Referral Link
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-4 text-center">
          <div className="font-syne font-bold text-2xl text-white">{data.referrals.length}</div>
          <div className="text-[#7b82a8] text-sm">Total Referrals</div>
        </div>
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-4 text-center">
          <div className="font-syne font-bold text-2xl text-accent-green">{credited}</div>
          <div className="text-[#7b82a8] text-sm">Credited</div>
        </div>
        <div className="bg-[#111527] border border-white/5 rounded-2xl p-4 text-center">
          <div className="font-syne font-bold text-2xl text-accent-gold">{pending}</div>
          <div className="text-[#7b82a8] text-sm">Pending</div>
        </div>
      </div>

      {/* Referral history */}
      <div className="bg-[#111527] border border-white/5 rounded-2xl">
        <div className="p-6 border-b border-white/5">
          <h2 className="font-syne font-bold text-lg text-white">Referral History</h2>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="shimmer h-12 rounded-xl" />)}</div>
        ) : data.referrals.length > 0 ? (
          <div className="divide-y divide-white/5">
            {data.referrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between p-5">
                <div>
                  <div className="font-medium text-white">{ref.users?.full_name || 'Friend'}</div>
                  <div className="text-xs text-[#7b82a8]">{ref.users?.email} · {formatDate(ref.created_at)}</div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${ref.status==='credited'?'badge-success':ref.status==='pending'?'badge-warning':'badge-muted'}`}>
                    {ref.status}
                  </span>
                  {ref.status === 'credited' && <div className="text-accent-green text-sm font-semibold mt-1">+₹500</div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🎁</div>
            <div className="text-[#7b82a8]">No referrals yet. Share your code to start earning!</div>
          </div>
        )}
      </div>
    </div>
  )
}