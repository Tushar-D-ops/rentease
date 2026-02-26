'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function PropertyDetailPage() {
  const { id } = useParams()
  const { user } = useUser()
  const router = useRouter()

  const [property, setProperty] = useState(null)
  const [rooms, setRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [existingEnrollment, setExistingEnrollment] = useState(null)
  const [pendingRequest, setPendingRequest] = useState(null)
  const [imgIdx, setImgIdx] = useState(0)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchProperty()
    if (user) checkExistingStatus()
  }, [id, user])

  async function fetchProperty() {
    const res = await fetch(`/api/properties/${id}`)
    if (!res.ok) { toast.error('Property not found'); router.push('/student/properties'); return }
    const data = await res.json()
    setProperty(data)
    setRooms(data.rooms || [])
    setLoading(false)
  }

  async function checkExistingStatus() {
    const { data: student } = await supabase.from('users').select('id').eq('clerk_id', user.id).maybeSingle()
    if (!student) return
    const [{ data: enrollment }, { data: pending }] = await Promise.all([
      supabase.from('enrollments').select('id,property_id,status,monthly_rent').eq('student_id', student.id).eq('status', 'active').maybeSingle(),
      supabase.from('enrollments').select('id,property_id,status').eq('student_id', student.id).eq('property_id', id).in('status', ['pending', 'approved']).maybeSingle(),
    ])
    setExistingEnrollment(enrollment || null)
    setPendingRequest(pending || null)
  }

  async function handleBooking() {
    if (!selectedRoom) return toast.error('Please select a room first')
    if (existingEnrollment) return toast.error('You already have an active enrollment')
    setBooking(true)
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: id, roomId: selectedRoom.id, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Booking failed')
      toast.success('Booking request sent! The owner will review and approve shortly.')
      setPendingRequest({ status: 'pending' })
      setSelectedRoom(null)
      setMessage('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBooking(false)
    }
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="shimmer h-64 rounded-2xl" />
      <div className="shimmer h-8 rounded w-1/2" />
      <div className="shimmer h-4 rounded w-1/3" />
    </div>
  )

  if (!property) return null

  const availableRooms = rooms.filter(r => r.status === 'available')
  const discounted = property.current_price < property.base_price

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back */}
      <Link href="/student/properties" className="inline-flex items-center gap-2 text-[#7b82a8] hover:text-white text-sm mb-6 transition-colors">
        ← Back to properties
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT - Property Info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Image Gallery */}
          <div className="bg-[#111527] border border-white/5 rounded-2xl overflow-hidden">
            <div className="relative h-64 bg-[#1a2035]">
              {property.images?.[imgIdx]
                ? <Image src={property.images[imgIdx]} alt={property.name} fill className="object-cover" sizes="800px" />
                : <div className="flex items-center justify-center h-full text-6xl opacity-20">🏠</div>}
              {property.images?.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                  {property.images.map((_, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === imgIdx ? 'bg-white scale-125' : 'bg-white/40'}`} />
                  ))}
                </div>
              )}
              {discounted && (
                <div className="absolute top-3 left-3 bg-accent-green/20 text-accent-green text-xs font-bold px-2 py-1 rounded-full">
                  Price Drop 🎉
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="bg-[#111527] border border-white/5 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="font-syne font-bold text-2xl text-white">{property.name}</h1>
              {property.gender_restriction !== 'any' && (
                <span className="badge-info text-xs px-3 py-1.5 rounded-full capitalize flex-shrink-0">
                  {property.gender_restriction === 'male' ? '👨' : '👩'} {property.gender_restriction} only
                </span>
              )}
            </div>
            <p className="text-[#7b82a8] text-sm mb-4">📍 {property.address}, {property.city}</p>

            {(property.distance_km || property.travel_time_walk) && (
              <div className="flex flex-wrap gap-4 mb-4 text-sm">
                {property.distance_km && <span className="text-accent-green font-medium">🗺️ {property.distance_km} km from college</span>}
                {property.travel_time_walk && <span className="text-[#7b82a8]">🚶 {property.travel_time_walk} min walk</span>}
                {property.travel_time_transit && <span className="text-[#7b82a8]">🚌 {property.travel_time_transit} min transit</span>}
              </div>
            )}

            {property.description && (
              <p className="text-[#7b82a8] text-sm leading-relaxed mb-4">{property.description}</p>
            )}

            {property.amenities?.length > 0 && (
              <div>
                <div className="text-xs text-[#7b82a8] uppercase tracking-wider mb-2 font-medium">Amenities</div>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map(a => (
                    <span key={a} className="bg-white/5 border border-white/10 text-[#c5ccf0] text-xs px-3 py-1.5 rounded-lg capitalize">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rooms */}
          <div className="bg-[#111527] border border-white/5 rounded-2xl p-6">
            <h2 className="font-syne font-bold text-lg text-white mb-4">
              Available Rooms <span className="text-[#7b82a8] font-normal text-sm">({availableRooms.length} of {rooms.length})</span>
            </h2>
            {availableRooms.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">😔</div>
                <p className="text-[#7b82a8]">No rooms available right now. Check back later!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableRooms.map(room => (
                  <button key={room.id} onClick={() => setSelectedRoom(selectedRoom?.id === room.id ? null : room)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selectedRoom?.id === room.id
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-white/10 hover:border-white/20 bg-white/5'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white text-sm">{room.room_number || `Room ${room.id.slice(0,6)}`}</span>
                      <span className="text-xs bg-accent-green/20 text-accent-green px-2 py-0.5 rounded-full">Available</span>
                    </div>
                    {room.type && <div className="text-xs text-[#7b82a8] capitalize mb-1">Type: {room.type}</div>}
                    {room.floor && <div className="text-xs text-[#7b82a8]">Floor: {room.floor}</div>}
                    {selectedRoom?.id === room.id && (
                      <div className="mt-2 text-brand-400 text-xs font-semibold">✓ Selected</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT - Booking Card */}
        <div className="lg:col-span-1">
          <div className="bg-[#111527] border border-white/5 rounded-2xl p-6 sticky top-6">
            <div className="mb-4">
              <div className="text-brand-400 font-syne font-bold text-3xl">
                {formatCurrency(property.current_price)}
                <span className="text-[#7b82a8] font-normal text-base">/mo</span>
              </div>
              {discounted && (
                <div className="text-[#7b82a8] text-sm line-through">{formatCurrency(property.base_price)}/mo</div>
              )}
            </div>

            <div className="space-y-2 mb-5 text-sm">
              <div className="flex justify-between text-[#7b82a8]">
                <span>Total rooms</span><span className="text-white">{rooms.length}</span>
              </div>
              <div className="flex justify-between text-[#7b82a8]">
                <span>Available</span><span className="text-accent-green font-semibold">{availableRooms.length}</span>
              </div>
              {property.avg_rating && (
                <div className="flex justify-between text-[#7b82a8]">
                  <span>Rating</span><span className="text-yellow-400">★ {property.avg_rating}</span>
                </div>
              )}
            </div>

            <div className="h-px bg-white/5 mb-5" />

            {existingEnrollment ? (
              <div className="text-center">
                <div className="text-3xl mb-2">🏠</div>
                <p className="text-[#7b82a8] text-sm mb-3">You already have an active enrollment</p>
                <Link href="/student" className="block w-full text-center bg-white/5 text-white text-sm font-semibold py-3 rounded-xl hover:bg-white/10 transition-colors">
                  View Dashboard
                </Link>
              </div>
            ) : pendingRequest ? (
              <div className="text-center">
                <div className="text-3xl mb-2">⏳</div>
                <p className="text-accent-green font-semibold text-sm mb-1">Request Sent!</p>
                <p className="text-[#7b82a8] text-xs mb-3">Waiting for owner approval. You'll get an email once confirmed.</p>
                <Link href="/student" className="block w-full text-center bg-white/5 text-white text-sm font-semibold py-3 rounded-xl hover:bg-white/10 transition-colors">
                  Go to Dashboard
                </Link>
              </div>
            ) : availableRooms.length === 0 ? (
              <div className="text-center text-[#7b82a8] text-sm py-4">
                No rooms currently available
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="text-xs text-[#7b82a8] uppercase tracking-wider mb-2 block">Selected Room</label>
                  {selectedRoom ? (
                    <div className="flex items-center justify-between bg-brand-500/10 border border-brand-500/30 rounded-xl px-4 py-3">
                      <span className="text-brand-300 text-sm font-semibold">{selectedRoom.room_number || `Room ${selectedRoom.id.slice(0,6)}`}</span>
                      <button onClick={() => setSelectedRoom(null)} className="text-[#7b82a8] hover:text-white text-xs">✕</button>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#7b82a8] text-sm">
                      Select a room from the list
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="text-xs text-[#7b82a8] uppercase tracking-wider mb-2 block">Message to owner (optional)</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
                    placeholder="Introduce yourself or ask a question..."
                    className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a5070] resize-none focus:border-brand-500/50 outline-none" />
                </div>

                <button onClick={handleBooking} disabled={!selectedRoom || booking}
                  className="w-full bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity">
                  {booking ? '⏳ Sending request...' : '🏠 Request to Book'}
                </button>

                <p className="text-[#7b82a8] text-xs text-center mt-3">
                  The owner reviews and approves all booking requests
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}