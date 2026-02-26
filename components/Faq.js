'use client'

import { useState } from 'react'

export default function Faq() {
     const [openFaq, setOpenFaq] = useState(null)
     
    const FAQS = [
    { q: 'Is RentEase completely free for students?', a: 'Yes! Students can find PGs, pay rent, use the AI assistant, and access all features for free. Owners pay nothing either. Platform earns 1% on successful transactions.' },
    { q: "How does the QR entry system work?", a: 'Each student gets a unique SHA-256 hash QR code. At the gate, the owner/guard scans it. The server verifies the token, toggles in/out status, logs the timestamp, and detects curfew violations — all in under 200ms.' },
    { q: "What happens if a student doesn't pay rent?", a: 'Automated reminders go out on the 5th. A 2% late fee is added on the 10th. The account is flagged on the 15th and the owner is notified. The student\'s dashboard shows overdue status prominently.' },
    { q: 'How is dynamic pricing calculated?', a: 'A daily cron job checks room occupancy. If >80% filled, price increases 5%. If <40% filled, price drops 3%. Changes are logged in pricing_history with full audit trail.' },
    { q: 'Can I host RentEase completely for free?', a: 'Yes! The entire stack (Vercel, Supabase, Clerk, Upstash, Resend, Gemini) has generous free tiers that support up to ~10,000 users before any paid plans are needed.' },
  ]

    return(
        <section className="py-24 px-[5%]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-brand-500 text-xs font-bold uppercase tracking-[3px] mb-4">FAQ</div>
            <h2 className="font-syne font-extrabold text-[clamp(2rem,4vw,3rem)]">Common questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-[#111527] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left">
                  <span className="font-semibold text-white">{faq.q}</span>
                  <span className={`text-brand-400 text-xl transition-transform duration-300 flex-shrink-0 ml-4 ${openFaq===i?'rotate-45':''}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 text-[#7b82a8] text-sm leading-relaxed border-t border-white/5 pt-4">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    )
}    