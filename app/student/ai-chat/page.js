'use client'
import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'

const SUGGESTIONS = [
  'What PGs are available near my college?',
  'Explain my electricity bill breakdown',
  'How does the referral program work?',
  'What happens if I pay rent late?',
  'How do I raise a dispute?',
]

export default function AIChatPage() {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Hi! 👋 I'm RentBot, your smart accommodation assistant powered by Google Gemini. I can help you find PGs, explain bills, or guide you through the platform. What can I help you with?",
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage(text) {
    const userMsg =input.trim()
    if (!userMsg || loading) return
    setInput('')
    const newMessages = [...messages, { role:'user', content:userMsg }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'AI unavailable')
      const { reply } = await res.json()
      setMessages([...newMessages, { role:'assistant', content:reply }])
    } catch (err) {
      toast.error(err.message || 'Failed to get response')
      setMessages([...newMessages, { role:'assistant', content:"Sorry, I'm having trouble right now. Please try again! 🙏" }])
    } finally { setLoading(false) }
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col h-[calc(100vh-70px)] sm:h-[calc(100vh-80px)]">
      <div className="mb-6">
        <h1 className="font-syne font-bold text-2xl sm:text-3xl lg:text-4xl text-white mb-1">AI Assistant</h1>
        <p className="text-[#7b82a8] text-sm sm:text-base">Powered by Google Gemini · Free tier</p>
      </div>

     <div className="flex-1 bg-[#111527] border border-white/5 rounded-2xl flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role==='user'?'flex-row-reverse':''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${msg.role==='assistant'?'bg-gradient-to-br from-brand-500 to-accent-purple':'bg-white/10'}`}>
                {msg.role === 'assistant' ? '🤖' : '👤'}
              </div>
              <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm sm:text-base leading-relaxed ... ${msg.role==='user'?'bg-brand-500 text-white rounded-tr-none':'bg-[#1a2035] text-white/90 rounded-tl-none'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center text-sm">🤖</div>
              <div className="bg-[#1a2035] rounded-2xl rounded-tl-none px-4 py-3 flex gap-1 items-center h-10">
                {[0,150,300].map((d) => <div key={d} className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{animationDelay:`${d}ms`}} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length <= 1 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((q) => (
              <button key={q} onClick={() => sendMessage(q)}
                className="text-xs sm:text-sm bg-white/5 hover:bg-brand-500/10 hover:text-brand-400 text-[#7b82a8] px-3 py-1.5 rounded-full transition-colors border border-white/5 hover:border-brand-500/20 whitespace-nowrap">
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="p-3 sm:p-4 border-t border-white/5 flex flex-col sm:flex-row gap-3">
          <input type="text" value={input} onChange={(e)=>setInput(e.target.value)}
            onKeyDown={(e)=>e.key==='Enter'&&!e.shiftKey&&sendMessage()}
            placeholder="Ask me anything about your accommodation..."
            className="flex-1 bg-[#0b0f1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#7b82a8] focus:outline-none focus:border-brand-500" />
          <button onClick={()=>sendMessage()} disabled={!input.trim()||loading}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-colors">
            Send →
          </button>
        </div>
      </div>
    </div>
  )
}