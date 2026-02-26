'use client'
import Image from 'next/image'
import Link from 'next/link'
import { cn, formatCurrency } from '@/lib/utils'
import { scoreLabel } from '@/lib/recommendations/scorer'

export default function PropertyCard({ property, showScore = false, compact = false }) {
  const { id, name, address, city, distance_km, travel_time_walk, current_price, base_price,
    gender_restriction, amenities, images, avg_rating, score, rooms } = property

  const availableRooms = rooms?.filter((r) => r.status === 'available').length || 0
  const totalRooms = rooms?.length || 0
  const scoreMeta = score !== undefined ? scoreLabel(score) : null
  const discounted = current_price < base_price

  return (
    <div className={cn(
      'bg-[#111527] border border-white/5 rounded-2xl overflow-hidden',
      'hover:border-brand-500/30 hover:shadow-[0_8px_30px_rgba(79,110,247,0.1)] transition-all duration-300 group',
      compact ? 'flex gap-4 p-4' : 'flex flex-col'
    )}>
      <div className={cn('relative bg-[#1a2035] overflow-hidden flex items-center justify-center',
        compact ? 'w-24 h-24 rounded-xl flex-shrink-0' : 'h-48 w-full')}>
        {images?.[0]
          ? <Image src={images[0]} alt={name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="400px" />
          : <span className="text-4xl opacity-30">🏠</span>}
        <div className="absolute top-3 left-3 flex gap-2">
          {scoreMeta && showScore && (
            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:`${scoreMeta.color}20`, color:scoreMeta.color }}>{scoreMeta.label}</span>
          )}
          {discounted && <span className="bg-accent-green/20 text-accent-green text-xs font-bold px-2 py-1 rounded-full">Price Drop 🎉</span>}
        </div>
        {avg_rating && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-white text-xs font-bold">{avg_rating}</span>
          </div>
        )}
      </div>

      <div className={cn('flex flex-col', compact ? 'flex-1 min-w-0' : 'p-5')}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-syne font-bold text-white text-base leading-tight line-clamp-1">{name}</h3>
          {gender_restriction !== 'any' && (
            <span className="badge-info text-xs px-2 py-0.5 rounded-full flex-shrink-0 capitalize">
              {gender_restriction === 'male' ? '👨' : '👩'} {gender_restriction}
            </span>
          )}
        </div>
        <p className="text-[#7b82a8] text-xs mb-3 line-clamp-1">📍 {address}, {city}</p>
        {distance_km && (
          <div className="flex items-center gap-3 mb-3 text-xs">
            <span className="text-accent-green font-medium">🗺️ {distance_km}km from college</span>
            {travel_time_walk && <span className="text-[#7b82a8]">🚶 {travel_time_walk} min walk</span>}
          </div>
        )}
        {!compact && amenities?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {amenities.slice(0,4).map((a) => (
              <span key={a} className="bg-white/5 text-[#7b82a8] text-xs px-2 py-0.5 rounded-md capitalize">{a}</span>
            ))}
            {amenities.length > 4 && <span className="text-[#7b82a8] text-xs">+{amenities.length-4}</span>}
          </div>
        )}
        <div className="flex items-center justify-between mt-auto">
          <div>
            <div className="text-brand-400 font-syne font-bold text-lg">
              {formatCurrency(current_price)}<span className="text-[#7b82a8] font-normal text-sm">/mo</span>
            </div>
            {discounted && <div className="text-[#7b82a8] text-xs line-through">{formatCurrency(base_price)}</div>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#7b82a8]">{availableRooms}/{totalRooms} rooms</span>
            <Link href={`/student/properties/${id}`} className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
              View →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}