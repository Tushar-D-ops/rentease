'use client'
import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

// Result display states
const STATE = {
  IDLE: 'idle',
  SCANNING: 'scanning',
  LOADING: 'loading',
  SUCCESS_IN: 'success_in',
  SUCCESS_OUT: 'success_out',
  ERROR: 'error',
  CURFEW: 'curfew',
}

export default function ScannerPage() {
  const { user } = useUser()

  // Property selection
  const [properties, setProperties]     = useState([])
  const [selectedProp, setSelectedProp] = useState('')
  const [propsLoading, setPropsLoading] = useState(true)

  // Scanner state
  const [scanState, setScanState]       = useState(STATE.IDLE)
  const [result, setResult]             = useState(null)   // { student_name, scan_type, is_curfew_violation, timestamp, message }
  const [errorMsg, setErrorMsg]         = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [jsQRLoaded, setJsQRLoaded]     = useState(false)

  // Refs
  const videoRef      = useRef(null)
  const canvasRef     = useRef(null)
  const streamRef     = useRef(null)
  const animFrameRef  = useRef(null)
  const lastScanRef   = useRef(0) // debounce: don't scan same frame twice

  // ─── Load owner's properties ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    async function loadProperties() {
      const { data: owner } = await supabase
        .from('users').select('id').eq('clerk_id', user.id).maybeSingle()
      if (!owner) { setPropsLoading(false); return }
      const { data: props } = await supabase
        .from('properties').select('id,name').eq('owner_id', owner.id).eq('status', 'approved')
      setProperties(props || [])
      if (props?.length === 1) setSelectedProp(props[0].id) // auto-select if only one
      setPropsLoading(false)
    }
    loadProperties()
  }, [user])

  // ─── Load jsQR from CDN ───────────────────────────────────────────────────
  useEffect(() => {
    if (window.jsQR) { setJsQRLoaded(true); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js'
    script.onload = () => setJsQRLoaded(true)
    script.onerror = () => setErrorMsg('Failed to load QR library. Please refresh.')
    document.head.appendChild(script)
    return () => script.remove()
  }, [])

  // ─── Start camera ─────────────────────────────────────────────────────────
  async function startCamera() {
    if (!selectedProp) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCameraActive(true)
      setScanState(STATE.SCANNING)
      startFrameLoop()
    } catch (err) {
      setErrorMsg('Camera access denied. Please allow camera permissions and try again.')
      setScanState(STATE.ERROR)
    }
  }

  // ─── Stop camera ──────────────────────────────────────────────────────────
  function stopCamera() {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraActive(false)
    setScanState(STATE.IDLE)
  }

  // ─── Frame scanning loop ──────────────────────────────────────────────────
  function startFrameLoop() {
    function tick() {
      if (!videoRef.current || !canvasRef.current || !window.jsQR) {
        animFrameRef.current = requestAnimationFrame(tick)
        return
      }
      const video  = videoRef.current
      const canvas = canvasRef.current
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(tick)
        return
      }

      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      })

      const now = Date.now()
      if (code && now - lastScanRef.current > 2000) { // 2s debounce between scans
        lastScanRef.current = now
        handleScan(code.data)
        return // stop loop during API call
      }

      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
  }

  // ─── Handle scanned QR data ───────────────────────────────────────────────
  async function handleScan(qrRaw) {
    if (!selectedProp) return
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
        // Resume scanning after 3s
        setTimeout(() => {
          setScanState(STATE.SCANNING)
          setErrorMsg('')
          startFrameLoop()
        }, 3000)
        return
      }

      setResult(data)

      if (data.is_curfew_violation) {
        setScanState(STATE.CURFEW)
      } else if (data.scan_type === 'in') {
        setScanState(STATE.SUCCESS_IN)
      } else {
        setScanState(STATE.SUCCESS_OUT)
      }

      // Auto-resume scanning after 3s
      setTimeout(() => {
        setScanState(STATE.SCANNING)
        setResult(null)
        startFrameLoop()
      }, 3000)

    } catch {
      setErrorMsg('Network error. Please try again.')
      setScanState(STATE.ERROR)
      setTimeout(() => {
        setScanState(STATE.SCANNING)
        setErrorMsg('')
        startFrameLoop()
      }, 3000)
    }
  }

  // ─── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => () => stopCamera(), [])

  const selectedPropName = properties.find(p => p.id === selectedProp)?.name || ''

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-syne font-bold text-3xl text-white mb-1">QR Scanner</h1>
          <p className="text-[#7b82a8] text-sm">Scan student QR codes to log entry/exit</p>
        </div>
        <Link href="/owner/inout-logs"
          className="text-sm text-brand-400 hover:text-brand-300 bg-brand-500/10 px-4 py-2 rounded-xl">
          View Logs →
        </Link>
      </div>

      {/* Property selector */}
      <div className="bg-[#111527] border border-white/5 rounded-2xl p-4 mb-4">
        <label className="block text-xs text-[#7b82a8] uppercase tracking-wider mb-2">
          Select Property to Scan For
        </label>
        {propsLoading ? (
          <div className="shimmer h-10 rounded-xl" />
        ) : properties.length === 0 ? (
          <div className="text-[#7b82a8] text-sm py-2">
            No approved properties found.{' '}
            <Link href="/owner/properties" className="text-brand-400 underline">Add one →</Link>
          </div>
        ) : (
          <select
            value={selectedProp}
            onChange={e => { setSelectedProp(e.target.value); stopCamera() }}
            className="w-full bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white"
          >
            <option value="">-- Choose a property --</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Scanner viewport */}
      <div className="bg-[#111527] border border-white/5 rounded-2xl overflow-hidden mb-4">

        {/* Camera view */}
        <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Idle / no property */}
          {!cameraActive && scanState === STATE.IDLE && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
              <div className="text-6xl">📷</div>
              <div className="text-white font-semibold text-center">
                {!selectedProp ? 'Select a property above to start' : 'Ready to scan'}
              </div>
              {selectedProp && jsQRLoaded && (
                <button
                  onClick={startCamera}
                  className="bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
                >
                  📷 Start Camera
                </button>
              )}
              {selectedProp && !jsQRLoaded && (
                <div className="text-[#7b82a8] text-sm animate-pulse">Loading QR scanner...</div>
              )}
            </div>
          )}

          {/* Scanning state — show crosshair overlay */}
          {cameraActive && scanState === STATE.SCANNING && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Corner brackets */}
              <div className="relative w-56 h-56">
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-brand-500 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-brand-500 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-brand-500 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-brand-500 rounded-br-lg" />
                {/* Scan line */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-brand-500 to-transparent shadow-[0_0_8px_#4f6ef7] animate-scan" />
              </div>
              {/* Label */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="text-xs text-white/70 bg-black/50 px-3 py-1 rounded-full">
                  Point camera at student QR code
                </span>
              </div>
            </div>
          )}

          {/* Loading state */}
          {scanState === STATE.LOADING && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-white font-semibold">Verifying...</div>
            </div>
          )}

          {/* Success — Check IN */}
          {scanState === STATE.SUCCESS_IN && result && (
            <div className="absolute inset-0 bg-accent-green/20 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-6">
              <div className="w-20 h-20 rounded-full bg-accent-green/20 border-4 border-accent-green flex items-center justify-center text-4xl">
                ✅
              </div>
              <div className="text-accent-green font-syne font-bold text-2xl">Checked IN</div>
              <div className="text-white font-semibold text-lg">{result.student_name}</div>
              <div className="text-[#7b82a8] text-sm">
                {new Date(result.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}

          {/* Success — Check OUT */}
          {scanState === STATE.SUCCESS_OUT && result && (
            <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-6">
              <div className="w-20 h-20 rounded-full bg-blue-500/20 border-4 border-blue-400 flex items-center justify-center text-4xl">
                🚪
              </div>
              <div className="text-blue-400 font-syne font-bold text-2xl">Checked OUT</div>
              <div className="text-white font-semibold text-lg">{result.student_name}</div>
              <div className="text-[#7b82a8] text-sm">
                {new Date(result.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}

          {/* Curfew violation */}
          {scanState === STATE.CURFEW && result && (
            <div className="absolute inset-0 bg-red-900/40 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-6">
              <div className="w-20 h-20 rounded-full bg-red-500/20 border-4 border-red-500 flex items-center justify-center text-4xl animate-pulse">
                ⚠️
              </div>
              <div className="text-red-400 font-syne font-bold text-2xl">Curfew Violation!</div>
              <div className="text-white font-semibold text-lg">{result.student_name}</div>
              <div className="text-red-300 text-sm font-medium">Checked OUT after curfew hours</div>
              <div className="text-[#7b82a8] text-sm">
                {new Date(result.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}

          {/* Error state */}
          {scanState === STATE.ERROR && (
            <div className="absolute inset-0 bg-red-900/30 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-6">
              <div className="text-5xl">❌</div>
              <div className="text-red-400 font-semibold text-center">{errorMsg || 'Scan failed'}</div>
              <div className="text-[#7b82a8] text-xs text-center">Retrying in 3 seconds...</div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="p-4 flex items-center justify-between border-t border-white/5">
          <div className="text-sm">
            {selectedProp
              ? <span className="text-[#7b82a8]">📍 <span className="text-white font-medium">{selectedPropName}</span></span>
              : <span className="text-[#7b82a8]">No property selected</span>
            }
          </div>
          {cameraActive ? (
            <button
              onClick={stopCamera}
              className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              ⏹ Stop
            </button>
          ) : (
            selectedProp && jsQRLoaded && (
              <button
                onClick={startCamera}
                className="text-xs bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                ▶ Start
              </button>
            )
          )}
        </div>
      </div>

      {/* Info cards */}
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
        Each QR can only be scanned once every 30 seconds · Logs saved instantly
      </p>
    </div>
  )
}