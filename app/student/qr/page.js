'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import toast from 'react-hot-toast'

export default function StudentQRPage() {
  const { user } = useUser()
  const [qrData, setQrData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => { fetchQR() }, [])

  async function fetchQR() {
    try {
      const res = await fetch('/api/qr/generate')
      if (res.ok) { setQrData(await res.json()) }
      else await generateQR()
    } catch { toast.error('Failed to load QR code') }
    finally { setLoading(false) }
  }

  async function generateQR() {
    setRegenerating(true)
    try {
      const res = await fetch('/api/qr/generate', { method: 'POST' })
      setQrData(await res.json())
      toast.success('QR code generated!')
    } catch { toast.error('Failed to generate QR') }
    finally { setRegenerating(false) }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="font-syne font-bold text-3xl text-white mb-1">My QR Code</h1>
        <p className="text-[#7b82a8]">Show this at the gate to log your entry or exit</p>
      </div>

      <div className="bg-[#111527] border border-white/5 rounded-2xl p-8 text-center">
        {loading ? (
          <div className="w-64 h-64 mx-auto shimmer rounded-2xl" />
        ) : qrData?.qrDataURL ? (
          <div>
            <div className="relative w-64 h-64 mx-auto mb-6">
              <div className="absolute inset-0 rounded-2xl bg-white p-4">
                <img src={qrData.qrDataURL} alt="Your QR Code" className="w-full h-full" />
              </div>
              <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-brand-500 to-transparent shadow-[0_0_8px_#4f6ef7] animate-scan pointer-events-none" />
            </div>
            <div className="font-syne font-bold text-xl text-white mb-1">{user?.firstName} {user?.lastName}</div>
            <div className="text-[#7b82a8] text-sm mb-6">Student ID · RentEase Verified</div>
            <div className="bg-[#0b0f1e] border border-white/5 rounded-xl p-3 mb-6">
              <div className="text-xs text-[#7b82a8] mb-1 uppercase tracking-widest">Token</div>
              <div className="text-xs text-brand-400 font-mono break-all">{qrData.token?.slice(0,32)}...</div>
            </div>
            <div className="flex gap-3">
              <button onClick={generateQR} disabled={regenerating}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50">
                {regenerating ? '⏳ Generating...' : '🔄 Regenerate'}
              </button>
              <button onClick={() => { const a=document.createElement('a'); a.download='rentease-qr.png'; a.href=qrData.qrDataURL; a.click() }}
                className="flex-1 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                📥 Download
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-6xl mb-4">📲</div>
            <div className="text-white font-semibold mb-2">No QR Code Yet</div>
            <div className="text-[#7b82a8] text-sm mb-6">Generate your unique entry QR code</div>
            <button onClick={generateQR} disabled={regenerating}
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 py-3 rounded-xl transition-colors disabled:opacity-50">
              {regenerating ? 'Generating...' : 'Generate QR Code'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-[#111527] border border-white/5 rounded-xl p-4">
          <div className="text-lg mb-2">🔐</div>
          <div className="text-sm font-semibold text-white mb-1">Encrypted & Secure</div>
          <div className="text-xs text-[#7b82a8]">Unique SHA-256 hash — cannot be duplicated</div>
        </div>
        <div className="bg-[#111527] border border-white/5 rounded-xl p-4">
          <div className="text-lg mb-2">⚡</div>
          <div className="text-sm font-semibold text-white mb-1">Real-time Logging</div>
          <div className="text-xs text-[#7b82a8]">Every scan logged instantly with timestamp</div>
        </div>
      </div>
    </div>
  )
}