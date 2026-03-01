'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// ✅ Must be dynamic — no SSR, camera only works in browser
const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then(mod => mod.Scanner),
  { ssr: false }
)

const STATE = {
  IDLE: 'idle',
  SCANNING: 'scanning',
  LOADING: 'loading',
  SUCCESS_IN: 'success_in',
  SUCCESS_OUT: 'success_out',
  CURFEW: 'curfew',
  ERROR: 'error',
}

export default function ScannerPage() {
  const { user } = useUser()

  const [properties, setProperties]     = useState([])
  const [selectedProp, setSelectedProp] = useState('')
  const [propsLoading, setPropsLoading] = useState(true)
  const [scanState, setScanState]       = useState(STATE.IDLE)
  const [result, setResult]             = useState(null)
  const [errorMsg, setErrorMsg]         = useState('')
  const [scannerOn, setScannerOn]       = useState(false)
  const [lastScan, setLastScan]         = useState(0) // debounce

  // Load owner's properties
  useEffect(() => {
    if (!user) return
    async function load() {
      const { data: owner } = await supabase
        .from('users').select('id').eq('clerk_id', user.id).maybeSingle()
      if (!owner) { setPropsLoading(false); return }
      const { data: props } = await supabase
        .from('properties').select('id,name').eq('owner_id', owner.id)
      setProperties(props || [])
      if (props?.length === 1) setSelectedProp(props[0].id)
      setPropsLoading(false)
    }
    load()
  }, [user])

  // Called every time scanner detects a QR code
  async function handleScan(detectedCodes) {
    if (!detectedCodes?.length) return
    const qrRaw = detectedCodes[0].rawValue
    if (!qrRaw || !selectedProp) return

    // Debounce — ignore if scanned within last 3 seconds
    const now = Date.now()
    if (now - lastScan < 3000) return
    setLastScan(now)

    setScannerOn(false) // pause scanner during API call
    setScanState(STATE.LOADING)

    try {
      const res = await fetch('/api/qr/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrRaw, propertyId: selectedProp }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Scan failed')
        setScanState(STATE.ERROR)
      } else {
        setResult(data)
        if (data.is_curfew_violation) setScanState(STATE.CURFEW)
        else if (data.scan_type === 'in') setScanState(STATE.SUCCESS_IN)
        else setScanState(STATE.SUCCESS_OUT)
      }
    } catch {
      setErrorMsg('Network error. Check your connection.')
      setScanState(STATE.ERROR)
    }

    // Resume scanner after 3s
    setTimeout(() => {
      setScanState(STATE.SCANNING)
      setResult(null)
      setErrorMsg('')
      setScannerOn(true)
    }, 3000)
  }

  function handleError(err) {
    console.error('Scanner error:', err)
    setErrorMsg(err?.message || 'Camera error. Check permissions.')
    setScanState(STATE.ERROR)
    setScannerOn(false)
  }

  function startScanner() {
    if (!selectedProp) return
    setScannerOn(true)
    setScanState(STATE.SCANNING)
  }

  function stopScanner() {
    setScannerOn(false)
    setScanState(STATE.IDLE)
    setResult(null)
    setErrorMsg('')
  }

  const selectedPropName = properties.find(p => p.id === selectedProp)?.name || ''

  return (
    <div className="max-w-lg mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-syne font-bold text-3xl text-white mb-1">QR Scanner</h1>
          <p className="text-[#7b82a8] text-sm">Scan student QR codes to log entry / exit</p>
        </div>
        <Link href="/owner/inout-logs"
          className="text-sm text-brand-400 hover:text-brand-300 bg-brand-500/10 px-4 py-2 rounded-xl">
          View Logs →
        </Link>
      </div>

      {/* Property selector */}
      <div className="bg-[#111527] border border-white/5 rounded-2xl p-4 mb-4">
        <label className="block text-xs text-[#7b82a8] uppercase tracking-wider mb-2">
          Select Property
        </label>
        {propsLoading ? (
          <div className="shimmer h-10 rounded-xl" />
        ) : properties.length === 0 ? (
          <p className="text-[#7b82a8] text-sm py-2">
            No properties found.{' '}
            <Link href="/owner/properties" className="text-brand-400 underline">Add one →</Link>
          </p>
        ) : (
          <select
            value={selectedProp}
            onChange={e => { setSelectedProp(e.target.value); stopScanner() }}
            className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white"
          >
            <option value="">-- Choose a property --</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Scanner box */}
      <div className="bg-[#111527] border border-white/5 rounded-2xl overflow-hidden mb-4">

        <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>

          {/* ✅ The actual scanner — only mounted when scannerOn = true */}
          {scannerOn && (
            <div className="absolute inset-0">
              <Scanner
                onScan={handleScan}
                onError={handleError}
                constraints={{ facingMode: 'environment' }} // rear camera
                scanDelay={300}
                components={{ tracker: false }} // no built-in overlay, we do our own
                styles={{ container: { width: '100%', height: '100%' }, video: { width: '100%', height: '100%', objectFit: 'cover' } }}
              />
              {/* Crosshair overlay — only show when actively scanning */}
              {scanState === STATE.SCANNING && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-56 h-56">
                    <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-brand-500 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-brand-500 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-brand-500 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-brand-500 rounded-br-lg" />
                    <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-brand-500 to-transparent shadow-[0_0_8px_#4f6ef7] animate-scan" />
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <span className="text-xs text-white/70 bg-black/50 px-3 py-1 rounded-full">
                      Point at student's QR code
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* IDLE */}
          {!scannerOn && scanState === STATE.IDLE && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
              <div className="text-6xl">📷</div>
              <div className="text-white font-semibold text-center">
                {!selectedProp ? 'Select a property above first' : 'Ready to scan'}
              </div>
              {selectedProp && (
                <button onClick={startScanner}
                  className="bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold px-8 py-3 rounded-xl hover:opacity-90">
                  📷 Start Camera
                </button>
              )}
            </div>
          )}

          {/* LOADING */}
          {scanState === STATE.LOADING && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 z-10">
              <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-white font-semibold">Verifying...</div>
            </div>
          )}

          {/* SUCCESS IN */}
          {scanState === STATE.SUCCESS_IN && result && (
            <div className="absolute inset-0 bg-accent-green/30 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
              <div className="w-20 h-20 rounded-full bg-accent-green/20 border-4 border-accent-green flex items-center justify-center text-4xl">✅</div>
              <div className="text-accent-green font-syne font-bold text-2xl">Checked IN</div>
              <div className="text-white font-semibold text-lg">{result.student_name}</div>
              <div className="text-[#7b82a8] text-sm">{new Date(result.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          )}

          {/* SUCCESS OUT */}
          {scanState === STATE.SUCCESS_OUT && result && (
            <div className="absolute inset-0 bg-blue-500/30 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
              <div className="w-20 h-20 rounded-full bg-blue-500/20 border-4 border-blue-400 flex items-center justify-center text-4xl">🚪</div>
              <div className="text-blue-400 font-syne font-bold text-2xl">Checked OUT</div>
              <div className="text-white font-semibold text-lg">{result.student_name}</div>
              <div className="text-[#7b82a8] text-sm">{new Date(result.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          )}

          {/* CURFEW */}
          {scanState === STATE.CURFEW && result && (
            <div className="absolute inset-0 bg-red-900/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
              <div className="w-20 h-20 rounded-full bg-red-500/20 border-4 border-red-500 flex items-center justify-center text-4xl animate-pulse">⚠️</div>
              <div className="text-red-400 font-syne font-bold text-2xl">Curfew Violation!</div>
              <div className="text-white font-semibold text-lg">{result.student_name}</div>
              <div className="text-red-300 text-sm font-medium">Checked OUT after curfew hours</div>
            </div>
          )}

          {/* ERROR */}
          {scanState === STATE.ERROR && (
            <div className="absolute inset-0 bg-red-900/30 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10 p-6">
              <div className="text-5xl">❌</div>
              <div className="text-red-400 font-semibold text-center">{errorMsg}</div>
              <button onClick={startScanner}
                className="mt-2 bg-white/10 text-white text-sm px-6 py-2 rounded-xl hover:bg-white/20">
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="p-4 flex items-center justify-between border-t border-white/5">
          <div className="text-sm">
            {selectedProp
              ? <span className="text-[#7b82a8]">📍 <span className="text-white font-medium">{selectedPropName}</span></span>
              : <span className="text-[#7b82a8]">No property selected</span>}
          </div>
          {scannerOn
            ? <button onClick={stopScanner} className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 font-semibold px-4 py-2 rounded-lg">⏹ Stop</button>
            : selectedProp && scanState === STATE.IDLE && (
              <button onClick={startScanner} className="text-xs bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 font-semibold px-4 py-2 rounded-lg">▶ Start</button>
            )
          }
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#111527] border border-white/5 rounded-xl p-3 text-center">
          <div className="text-lg mb-1">🟢</div>
          <div className="text-xs text-[#7b82a8]">Check IN</div>
          <div className="text-xs text-white font-medium mt-0.5">Green screen</div>
        </div>
        <div className="bg-[#111527] border border-white/5 rounded-xl p-3 text-center">
          <div className="text-lg mb-1">🚪</div>
          <div className="text-xs text-[#7b82a8]">Check OUT</div>
          <div className="text-xs text-white font-medium mt-0.5">Blue screen</div>
        </div>
        <div className="bg-[#111527] border border-red-500/20 rounded-xl p-3 text-center">
          <div className="text-lg mb-1">⚠️</div>
          <div className="text-xs text-[#7b82a8]">Curfew</div>
          <div className="text-xs text-red-400 font-medium mt-0.5">After 10 PM</div>
        </div>
      </div>

      <p className="text-[#4a5070] text-xs text-center mt-4">
        30-second cooldown between scans · Logs saved instantly to Supabase
      </p>
    </div>
  )
}