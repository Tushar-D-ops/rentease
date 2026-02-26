'use client'

import { useState } from "react";
import Link from 'next/link'

export default function Roles(){
   const [activeRole, setActiveRole] = useState('student')
   const STUDENT_FEATURES = [
    '🔍 Smart PG search with AI ranking',
    '🗺️ Real-time maps with college distance',
    '💳 One-click Razorpay rent payment',
    '📲 Personal QR code for gate entry',
    '📋 Full attendance & curfew history',
    '⚖️ Raise and track disputes',
    '🎁 Refer friends and earn cashback',
    '🤖 Ask RentBot anything, anytime',
  ]

  const OWNER_FEATURES = [
    '🏢 List and manage multiple properties',
    '💰 Auto-invoicing on the 1st of month',
    '⚡ Monthly electricity bill entry',
    '📊 Revenue & occupancy analytics',
    '📲 Real-time in/out log viewer',
    '🔄 Dynamic pricing automation',
    '⚖️ Receive & respond to disputes',
    '✅ Full tenant management',
  ]

    return(
     <section id="students" className="py-24 px-[5%]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-brand-500 text-xs font-bold uppercase tracking-[3px] mb-4">Role-Based Platform</div>
            <h2 className="font-syne font-extrabold text-[clamp(2rem,4vw,3rem)] mb-4">Built for every stakeholder</h2>
            <p className="text-[#7b82a8] text-lg max-w-xl mx-auto">Whether you're a student or an owner, RentEase has a tailored experience.</p>
          </div>
          <div className="flex justify-center gap-2 mb-8">
            {['student','owner'].map((r) => (
              <button key={r} onClick={() => setActiveRole(r)}
                className={`px-6 py-3 rounded-xl font-semibold capitalize transition-all ${activeRole===r?'bg-brand-500 text-white':'bg-[#111527] text-[#7b82a8] hover:text-white border border-white/5'}`}>
                {r === 'student' ? '🎓 Student' : '🏢 Owner'}
              </button>
            ))}
          </div>
          <div className="bg-[#111527] border border-white/5 rounded-2xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(activeRole === 'student' ? STUDENT_FEATURES : OWNER_FEATURES).map((feat) => (
                <div key={feat} className="flex items-center gap-3 text-sm text-[#c9d1d9]">
                  <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-brand-500" />
                  </div>
                  {feat}
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-white/5">
              <Link href="/sign-up" className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity">
                Get started as {activeRole === 'student' ? 'Student' : 'Owner'} →
              </Link>
            </div>
          </div>
        </div>
      </section>
    )
}