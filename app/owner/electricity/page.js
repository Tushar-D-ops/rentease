'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { format, startOfMonth } from 'date-fns'

export default function OwnerElectricityPage() {
  const { user } = useUser()
  const [properties, setProperties] = useState([])
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedProp, setSelectedProp] = useState('')
  const [rooms, setRooms] = useState([])
  const [form, setForm] = useState({ room_id:'', billing_month:format(startOfMonth(new Date()),'yyyy-MM'), prev_reading:'', curr_reading:'', rate_per_unit:800 })

  useEffect(() => { if (user) fetchData() }, [user])
  useEffect(() => { if (selectedProp) fetchRooms(selectedProp) }, [selectedProp])

  async function fetchData() {
    const { data: owner } = await supabase.from('users').select('id').eq('clerk_id', user.id).single()
    if (!owner) { setLoading(false); return }
    const { data: props } = await supabase.from('properties').select('id,name,city').eq('owner_id', owner.id).eq('status','approved')
    setProperties(props || [])
    if (props?.length) {
      const { data: billData } = await supabase.from('electricity_bills')
        .select('*, rooms(room_number), properties(name)')
        .in('property_id', props.map(p=>p.id))
        .order('billing_month', { ascending: false }).limit(100)
      setBills(billData || [])
    }
    setLoading(false)
  }

  async function fetchRooms(propId) {
    const { data } = await supabase.from('rooms').select('id,room_number,room_type').eq('property_id', propId).order('room_number')
    setRooms(data || [])
  }

async function handleSubmit(e) {
  e.preventDefault()
  if (!selectedProp || !form.prev_reading || !form.curr_reading)
    return toast.error('Fill all required fields')
  if (parseInt(form.curr_reading) <= parseInt(form.prev_reading))
    return toast.error('Current reading must be greater than previous')

  setSubmitting(true)
  try {
    const res = await fetch('/api/electricity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property_id:    selectedProp,
        room_id:        form.room_id || null,
        billing_month:  form.billing_month + '-01',
        prev_reading:   parseInt(form.prev_reading),
        curr_reading:   parseInt(form.curr_reading),
        rate_per_unit:  parseInt(form.rate_per_unit),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed')
    toast.success(`Bill saved! ${data.invoices_updated} student invoice(s) updated.`)
    setShowForm(false)
    setForm({ room_id:'', billing_month:format(startOfMonth(new Date()),'yyyy-MM'), prev_reading:'', curr_reading:'', rate_per_unit:800 })
    fetchData()
  } catch (err) {
    toast.error(err.message)
  } finally {
    setSubmitting(false)
  }
}

  const units = form.curr_reading && form.prev_reading ? Math.max(0, parseInt(form.curr_reading) - parseInt(form.prev_reading)) : 0
  const estimatedBill = units * parseInt(form.rate_per_unit || 800)
  const billsByProp = bills.reduce((acc, b) => {
    const k = b.properties?.name || b.property_id
    if (!acc[k]) acc[k] = []
    acc[k].push(b); return acc
  }, {})

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-syne font-bold text-2xl sm:text-3xl lg:text-4xl text-white mb-1">Electricity Bills</h1>
          <p className="text-[#7b82a8] text-sm sm:text-base max-w-2xl">Record meter readings — automatically added to student invoices</p>
        </div>
        <button onClick={()=>setShowForm(!showForm)} className="w-full max-sm:text-sm md:w-auto sm:w-auto bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold px-2 py-3 rounded-xl hover:opacity-90">
          + Record Reading
        </button>
      </div>

      {showForm && (
        <div className="bg-[#111527] border border-brand-500/20 rounded-2xl p-4 sm:p-6 mb-8">
          <h2 className="font-syne font-bold text-xl text-white mb-6">Record Meter Reading</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#7b82a8] mb-2 block">Property *</label>
                <select value={selectedProp} onChange={e=>{setSelectedProp(e.target.value);setForm(p=>({...p,room_id:''}))}}
                  className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white">
                  <option value="">Select property...</option>
                  {properties.map(p=><option key={p.id} value={p.id}>{p.name} — {p.city}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#7b82a8] mb-2 block">Room <span className="text-[#4a5070]">(blank = whole property shared meter)</span></label>
                <select value={form.room_id} onChange={e=>setForm(p=>({...p,room_id:e.target.value}))} disabled={!selectedProp}
                  className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white disabled:opacity-40">
                  <option value="">Whole Property</option>
                  {rooms.map(r=><option key={r.id} value={r.id}>Room {r.room_number} ({r.room_type})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#7b82a8] mb-2 block">Billing Month *</label>
                <input type="month" value={form.billing_month} onChange={e=>setForm(p=>({...p,billing_month:e.target.value}))}
                  className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-[#7b82a8] mb-2 block">Rate per Unit (paise) — 800 = ₹8/unit</label>
                <input type="number" value={form.rate_per_unit} onChange={e=>setForm(p=>({...p,rate_per_unit:e.target.value}))}
                  className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-[#7b82a8] mb-2 block">Previous Reading (kWh) *</label>
                <input type="number" value={form.prev_reading} onChange={e=>setForm(p=>({...p,prev_reading:e.target.value}))} placeholder="e.g. 1240"
                  className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-[#7b82a8] mb-2 block">Current Reading (kWh) *</label>
                <input type="number" value={form.curr_reading} onChange={e=>setForm(p=>({...p,curr_reading:e.target.value}))} placeholder="e.g. 1390"
                  className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
              </div>
            </div>
            {units > 0 && (
              <div className="bg-[#0b0f1e] border border-accent-green/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-6">
                {[['Units Consumed',units,'#fff'],['Rate/Unit',`₹${(parseInt(form.rate_per_unit||0)/100).toFixed(2)}`,'#7b82a8'],['Bill Amount',formatCurrency(estimatedBill),'#06d6a0']].map(([l,v,c])=>(
                  <div key={l} className="text-center">
                    <div className="font-syne font-bold text-xl" style={{color:c}}>{v}</div>
                    <div className="text-xs text-[#7b82a8]">{l}</div>
                  </div>
                ))}
              </div>
            )}
           <div className="flex flex-col sm:flex-row gap-3">
              <button type="submit" disabled={submitting} className="w-full sm:w-auto bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold px-6 py-3 rounded-xl disabled:opacity-50">
                {submitting ? '⏳ Saving...' : '⚡ Record Bill'}
              </button>
              <button type="button" onClick={()=>setShowForm(false)} className="w-full sm:w-auto bg-white/5 text-white font-semibold px-6 py-3 rounded-xl">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="space-y-4">{[...Array(2)].map((_,i)=><div key={i} className="shimmer h-40 rounded-2xl"/>)}</div>
      : Object.keys(billsByProp).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(billsByProp).map(([propName, propBills])=>(
            <div key={propName} className="bg-[#111527] border border-white/5 rounded-2xl overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-white/5 flex flex-wrap items-center gap-3">
                <span className="text-xl">⚡</span>
                <h2 className="font-syne font-bold text-white">{propName}</h2>
                <span className="badge-info text-xs px-2 py-0.5 rounded-full">{propBills.length} bills</span>
              </div>
             <div className="w-full overflow-x-auto">
  <table className="w-full min-w-[700px] data-table">
                <thead><tr><th>Room</th><th>Month</th><th>Previous</th><th>Current</th><th>Units</th><th>Amount</th></tr></thead>
                <tbody>
                  {propBills.map(b=>(
                    <tr key={b.id}>
                      <td className="p-4 text-sm text-white">{b.rooms?.room_number || <span className="text-[#7b82a8]">Whole property</span>}</td>
                      <td className="p-4 text-[#7b82a8] text-sm">{new Date(b.billing_month).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</td>
                      <td className="p-4 text-[#7b82a8] text-sm font-mono">{b.prev_reading} kWh</td>
                      <td className="p-4 text-[#7b82a8] text-sm font-mono">{b.curr_reading} kWh</td>
                      <td className="p-4 text-white text-sm font-semibold">{b.curr_reading - b.prev_reading} units</td>
                      <td className="p-4 text-accent-green text-sm font-bold">{formatCurrency(b.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
             </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 sm:py-20 px-4 bg-[#111527] border border-white/5 rounded-2xl">
          <div className="text-5xl mb-4">⚡</div>
          <div className="text-white font-semibold mb-2">No electricity bills yet</div>
          <div className="text-[#7b82a8]">{properties.length === 0 ? 'You need at least one approved property first' : 'Click "+ Record Reading" to get started'}</div>
        </div>
      )}
    </div>
  )
}