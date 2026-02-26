'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { formatDate, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

const STATUS_TABS = ['pending', 'active', 'rejected']

export default function OwnerEnrollmentsPage() {
  const { user } = useUser()
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [processing, setProcessing] = useState(null)

  useEffect(() => { if (user) fetchEnrollments() }, [user, tab])

  async function fetchEnrollments() {
    setLoading(true)
    const res = await fetch(`/api/enrollments?status=${tab}`)
    const data = await res.json()
    setEnrollments(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function handleAction(enrollmentId, action) {
    setProcessing(enrollmentId)
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed')
      toast.success(action === 'approve' ? '✅ Enrollment approved! Student can now move in.' : '❌ Request rejected.')
      fetchEnrollments()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">Booking Requests</h1>
        <p className="text-[#7b82a8]">Review and manage student enrollment requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-[#111527] border border-white/5 rounded-xl p-1.5 w-fit">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setTab(s)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
              tab === s ? 'bg-brand-500 text-white' : 'text-[#7b82a8] hover:text-white'
            }`}>
            {s === 'pending' ? '⏳' : s === 'active' ? '✅' : '❌'} {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="shimmer h-28 rounded-2xl" />
          ))}
        </div>
      ) : enrollments.length === 0 ? (
        <div className="text-center py-20 bg-[#111527] border border-white/5 rounded-2xl">
          <div className="text-5xl mb-4">{tab === 'pending' ? '📭' : tab === 'active' ? '🏠' : '📋'}</div>
          <div className="text-white font-semibold mb-2">No {tab} requests</div>
          <div className="text-[#7b82a8] text-sm">
            {tab === 'pending' ? 'No students are waiting for approval right now' : `No ${tab} enrollments found`}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {enrollments.map(en => (
            <div key={en.id} className="bg-[#111527] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center text-sm font-bold text-white">
                      {en.users?.full_name?.[0] || '?'}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{en.users?.full_name || 'Unknown Student'}</div>
                      <div className="text-[#7b82a8] text-xs">{en.users?.email}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-[#7b82a8] mb-1">Property</div>
                      <div className="text-sm font-medium text-white">{en.properties?.name}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-[#7b82a8] mb-1">Room</div>
                      <div className="text-sm font-medium text-white">{en.rooms?.room_number || '—'}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-[#7b82a8] mb-1">Monthly Rent</div>
                      <div className="text-sm font-medium text-accent-green">{formatCurrency(en.monthly_rent)}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-[#7b82a8] mb-1">Requested</div>
                      <div className="text-sm font-medium text-white">{formatDate(en.requested_at)}</div>
                    </div>
                  </div>

                  {en.message && (
                    <div className="bg-white/5 rounded-xl p-3 mb-3">
                      <div className="text-xs text-[#7b82a8] mb-1">Student's message</div>
                      <p className="text-sm text-white/80 italic">"{en.message}"</p>
                    </div>
                  )}
                </div>

                {tab === 'pending' && (
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAction(en.id, 'approve')}
                      disabled={processing === en.id}
                      className="bg-accent-green/20 text-accent-green hover:bg-accent-green/30 font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                      {processing === en.id ? '...' : '✓ Approve'}
                    </button>
                    <button
                      onClick={() => handleAction(en.id, 'reject')}
                      disabled={processing === en.id}
                      className="bg-red-500/10 text-red-400 hover:bg-red-500/20 font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                      {processing === en.id ? '...' : '✕ Reject'}
                    </button>
                  </div>
                )}

                {tab === 'active' && (
                  <div className="flex-shrink-0">
                    <span className="badge-success text-xs px-3 py-1.5 rounded-full">Active</span>
                  </div>
                )}

                {tab === 'rejected' && (
                  <div className="flex-shrink-0">
                    <span className="badge-danger text-xs px-3 py-1.5 rounded-full">Rejected</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}