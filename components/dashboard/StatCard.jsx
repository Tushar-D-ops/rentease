'use client'
import { cn } from '@/lib/utils'

export default function StatCard({ icon, label, value, sub, trend, color = '#4f6ef7', loading }) {
  if (loading) {
    return (
      <div className="bg-[#111527] border border-white/5 rounded-2xl p-6">
        <div className="shimmer h-4 w-24 rounded mb-4" />
        <div className="shimmer h-8 w-32 rounded mb-2" />
        <div className="shimmer h-3 w-20 rounded" />
      </div>
    )
  }

  const trendPositive = trend?.startsWith('+')
  const trendNegative = trend?.startsWith('-')

  return (
    <div className="bg-[#111527] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-white/10 transition-all">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: `radial-gradient(circle at 0% 0%, ${color}10 0%, transparent 60%)` }} />
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: `${color}20` }}>
          {icon}
        </div>
        {trend && (
          <span className={cn('text-xs font-semibold px-2 py-1 rounded-full',
            trendPositive && 'bg-accent-green/10 text-accent-green',
            trendNegative && 'bg-accent-red/10 text-accent-red',
            !trendPositive && !trendNegative && 'bg-white/5 text-[#7b82a8]'
          )}>{trend}</span>
        )}
      </div>
      <div className="text-2xl font-syne font-bold text-white mb-1">{value}</div>
      <div className="text-sm font-medium text-white/80">{label}</div>
      {sub && <div className="text-xs text-[#7b82a8] mt-1">{sub}</div>}
    </div>
  )
}