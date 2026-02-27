

import Link from 'next/link'
import Counter from '@/components/Counter'
import Navbar from '@/components/Navbar'
import Roles from '@/components/Roles'
import Faq from '@/components/Faq'

function Blob({ color, style }) {
  return (
    <div className="absolute rounded-full pointer-events-none animate-drift" style={{
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      filter: 'blur(80px)', opacity: 0.18, ...style,
    }} />
  )
}

export default function LandingPage() {
 
  
 

  

  const FEATURES = [
    { icon: '🏠', title: 'Smart Property Search', desc: 'Filter by distance, budget, amenities, and gender preference. AI-ranked results show the best match for you first.' },
    { icon: '💳', title: 'Automated Billing', desc: 'Invoices auto-generate on the 1st. Razorpay checkout in one click. Late fees apply automatically if unpaid by the 10th.' },
    { icon: '📲', title: 'QR Entry System', desc: 'Every student gets an encrypted SHA-256 QR code. Scan at the gate to log check-in/out with curfew detection.' },
    { icon: '⚡', title: 'Electricity Tracking', desc: 'Owners enter meter readings monthly. Bills auto-split per room and added to student invoices. Zero disputes.' },
    { icon: '🤖', title: 'AI Chat Assistant', desc: 'Powered by Google Gemini. Answers questions about rent, bills, nearby PGs, disputes — 24/7, in plain language.' },
    { icon: '📊', title: 'Analytics Dashboard', desc: 'Revenue charts, occupancy rates, late payment %, all-time stats. Owners get full visibility into every property.' },
    { icon: '⚖️', title: 'Dispute Resolution', desc: 'Structured dispute workflow with evidence uploads. Admin mediates. Email notifications at every step.' },
    { icon: '🎁', title: 'Referral Program', desc: 'Refer a friend → you earn ₹500, they get ₹300 off first month. Tracked and credited automatically on enrollment.' },
    { icon: '🔄', title: 'Dynamic Pricing', desc: 'Occupancy >80%? Price nudges up 5%. Below 40%? 3% drop to fill rooms. Daily cron, no manual work.' },
  ]

  

  const BILLING_STEPS = [
    { icon: '📅', label: '1st', title: 'Invoice Generated', desc: 'Cron job creates invoice + Razorpay order for every active enrollment' },
    { icon: '📧', label: '1st', title: 'Email Sent', desc: 'Student receives invoice with pay button directly in email' },
    { icon: '🔔', label: '5th', title: 'Reminder Sent', desc: 'Automated payment reminder if invoice still unpaid' },
    { icon: '⚠️', label: '10th', title: 'Late Fee Applied', desc: '2% late fee added to invoice, updated email sent' },
    { icon: '🚫', label: '15th', title: 'Account Flagged', desc: 'Student account flagged, owner notified automatically' },
    { icon: '✅', label: 'Any', title: 'Payment Captured', desc: 'Razorpay webhook → update DB → confirmation email' },
  ]

  

  const TECH_STACK = [
    { name: 'Next.js 14', role: 'App Router, SSR, API routes', color: '#fff', icon: '⬛' },
    { name: 'Supabase', role: 'PostgreSQL + Realtime + RLS', color: '#06d6a0', icon: '⚡' },
    { name: 'Clerk', role: 'Auth + RBAC + metadata', color: '#7c3aed', icon: '🔐' },
    { name: 'Razorpay', role: 'Payments + webhooks', color: '#4f6ef7', icon: '💳' },
    { name: 'Upstash Redis', role: 'Rate limiting + caching', color: '#06d6a0', icon: '🚀' },
    { name: 'Resend', role: 'Transactional emails', color: '#f5a623', icon: '📧' },
    { name: 'Google Gemini', role: 'AI chat assistant', color: '#4285F4', icon: '🤖' },
    { name: 'Leaflet + OSM', role: 'Free maps, no API key', color: '#a8d8a8', icon: '🗺️' },
  ]

  return (
    <div className="bg-[#050810] text-white overflow-x-hidden">

      {/* ─── NAV ─── */}
      <Navbar/>

      {/* ─── HERO ─── */}
      
<section className="relative min-h-[100vh] flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-24 sm:pt-28 overflow-hidden">       
   <Blob color="#4f6ef7" style={{ width:600, height:600, top:'-100px', left:'-200px', animationDelay:'0s' }} />
        <Blob color="#7c3aed" style={{ width:500, height:500, bottom:'-100px', right:'-150px', animationDelay:'-4s' }} />
        <Blob color="#06d6a0" style={{ width:400, height:400, top:'30%', right:'10%', animationDelay:'-8s' }} />
        <div className="absolute inset-0 grid-overlay opacity-60 pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/30 rounded-full px-4 py-2 text-sm text-brand-400 font-medium mb-8">
            <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            100% Free Stack · Built for India · Production Ready
          </div>

          <h1 className="font-syne font-extrabold text-[clamp(2.5rem,7vw,5rem)] leading-[1.05] tracking-tight mb-6">
            The smartest way<br />
            to manage{' '}
            <span className="gradient-text">student PGs</span>
          </h1>

          <p className="text-[#7b82a8] text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            Find verified accommodations near your college. Automated billing. QR entry. AI chatbot. Real-time analytics. All in one platform — completely free.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <Link href="/sign-up" className="bg-gradient-to-r from-brand-500 to-accent-purple text-white font-bold text-lg px-8 py-4 rounded-2xl hover:opacity-90 transition-opacity shadow-[0_8px_30px_rgba(79,110,247,0.4)] animate-float">
              Start for Free →
            </Link>
            <a href="#features" className="flex items-center gap-2 bg-white/5 border border-white/10 text-white font-semibold text-lg px-8 py-4 rounded-2xl hover:bg-white/10 transition-all">
              Explore Features ↓
            </a>
          </div>

          {/* Dashboard mockup */}
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050810] z-10 pointer-events-none" style={{ top:'60%' }} />
            <div className="bg-[#111527] border border-white/10 rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-2 px-4 py-3 bg-[#0b0f1e] border-b border-white/5">
                <div className="w-3 h-3 rounded-full bg-[#ff4d6d]" />
                <div className="w-3 h-3 rounded-full bg-[#f5a623]" />
                <div className="w-3 h-3 rounded-full bg-[#06d6a0]" />
                <div className="flex-1 mx-4 bg-white/5 rounded-lg px-3 py-1 text-xs text-[#7b82a8]">rentease.in/student</div>
              </div>
              <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label:'Due This Month', value:'₹8,500', sub:'Due in 3 days', color:'#f5a623' },
                  { label:'Current Status', value:'Inside', sub:'Logged in 2h ago', color:'#06d6a0' },
                  { label:'Referrals', value:'3', sub:'₹1,500 earned', color:'#7c3aed' },
                  { label:'Accommodation', value:'Active', sub:'Sunrise PG, Pune', color:'#4f6ef7' },
                ].map((card) => (
                  <div key={card.label} className="bg-[#0b0f1e] rounded-xl p-4 border border-white/5">
                    <div className="text-[#7b82a8] text-xs mb-2">{card.label}</div>
                    <div className="font-syne font-bold text-xl mb-0.5" style={{ color: card.color }}>{card.value}</div>
                    <div className="text-[#7b82a8] text-xs">{card.sub}</div>
                  </div>
                ))}
              </div>
              <div className="px-4 sm:px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0b0f1e] rounded-xl p-4 border border-white/5">
                  <div className="text-sm font-semibold text-white mb-3">Next Payment</div>
                  <div className="space-y-2">
                    {[['Base Rent','₹7,500'],['⚡ Electricity','₹800'],['Total Due','₹8,500']].map(([l,v],i)=>(
                      <div key={l} className={`flex justify-between text-sm ${i===2?'border-t border-white/10 pt-2 font-bold text-brand-400':''}`}>
                        <span className="text-[#7b82a8]">{l}</span><span>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#0b0f1e] rounded-xl p-4 border border-white/5">
                  <div className="text-sm font-semibold text-white mb-3">Quick Actions</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[['📲','My QR'],['💳','Payments'],['🤖','AI Chat'],['⚖️','Disputes']].map(([e,l])=>(
                      <div key={l} className="flex items-center gap-2 bg-white/5 rounded-lg p-2 text-xs text-[#7b82a8]">
                        <span>{e}</span>{l}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── COUNTERS ─── */}
      <Counter/>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how" className="py-24 px-[5%]">
        <div className="max-w-5xl mx-auto text-center">
          <div className="text-brand-500 text-xs font-bold uppercase tracking-[3px] mb-4">Process</div>
          <h2 className="font-syne font-extrabold text-[clamp(2rem,4vw,3rem)] mb-4">From search to move-in<br />in minutes</h2>
          <p className="text-[#7b82a8] text-lg max-w-xl mx-auto mb-16">We've eliminated every friction point in the PG-finding experience.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step:'01', icon:'🔍', title:'Search Smart', desc:'Filter by distance from your college, budget, amenities, and gender. AI ranks results by match score.' },
              { step:'02', icon:'🏠', title:'Enroll Instantly', desc:'Pick a room, submit enrollment. Owner approves, QR code generates, your dashboard activates.' },
              { step:'03', icon:'✅', title:'Live Stress-Free', desc:'Pay rent in one click every month. Scan QR at the gate. Chat with AI for any help. Done.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="glass relative bg-[#111527] border border-white/5 rounded-2xl p-8 text-left hover:border-brand-500/30 transition-all">
                <div className="text-[4rem] font-syne font-extrabold text-white/5 absolute top-4 right-6 select-none">{step}</div>
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="font-syne font-bold text-xl text-white mb-2">{title}</h3>
                <p className="text-[#7b82a8] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-24 px-[5%] bg-[#0b0f1e]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-brand-500 text-xs font-bold uppercase tracking-[3px] mb-4">Platform Features</div>
            <h2 className="font-syne font-extrabold text-[clamp(2rem,4vw,3rem)] mb-4">Everything you need.<br />Nothing you don't.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="glass bg-[#111527] border border-white/10 rounded-2xl p-6 hover:border-brand-400/30 hover:shadow-[0_8px_30px_rgba(79,110,247,0.08)] transition-all group">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-2xl mb-4 group-hover:bg-brand-500/20 transition-colors">{icon}</div>
                <h3 className="font-syne font-bold text-white mb-2">{title}</h3>
                <p className="text-[#7b82a8] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ROLES ─── */}
      <Roles/>      

      {/* ─── BILLING TIMELINE ─── */}
      <section id="billing" className="py-24 px-[5%] bg-[#0b0f1e]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-brand-500 text-xs font-bold uppercase tracking-[3px] mb-4">Automated Billing</div>
            <h2 className="font-syne font-extrabold text-[clamp(2rem,4vw,3rem)] mb-4">Monthly billing on autopilot</h2>
            <p className="text-[#7b82a8] text-lg max-w-xl mx-auto">Cron jobs run on the 1st. Invoices generated, Razorpay orders created, emails sent — zero manual work.</p>
          </div>
          <div className="space-y-4">
            {BILLING_STEPS.map((step, i) => (
              <div className={`flex flex-col md:flex-row items-start md:items-center gap-6 ${i%2!==0?'md:flex-row-reverse':''}`}>
                <div className=" glass flex-1 bg-[#111527] border border-white/5 rounded-2xl p-5 hover:border-brand-500/30 transition-all">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">{step.icon}</span>
                    <span className="text-brand-500 text-xs font-bold uppercase tracking-widest">Day {step.label}</span>
                  </div>
                  <h3 className="font-syne font-bold text-white mb-1">{step.title}</h3>
                  <p className="text-[#7b82a8] text-sm">{step.desc}</p>
                </div>
                <div className="hidden md:flex w-10 h-10 rounded-full bg-brand-500/20 border-2 border-brand-500/40 items-center justify-center flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-brand-500" />
                </div>
                <div className="flex-1 hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── QR SYSTEM ─── */}
      <section id="qr" className="py-24 px-[5%]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <div className="text-brand-500 text-xs font-bold uppercase tracking-[3px] mb-4">Smart Entry System</div>
            <h2 className="font-syne font-extrabold text-[clamp(2rem,4vw,3rem)] mb-4">Scan. Log. Done.</h2>
            <p className="text-[#7b82a8] text-lg leading-relaxed mb-8">
              Every student gets a unique encrypted SHA-256 QR code. Scan at gate, server validates, toggles in/out, logs timestamp — all under 200ms via Redis + Supabase.
            </p>
            <div className="space-y-3">
              {[
                ['🔐','SHA-256 encrypted token — impossible to duplicate'],
                ['⚡','Redis-throttled: 1 scan per 30 seconds per token'],
                ['🌙','Automatic curfew violation detection (after 10 PM)'],
                ['📧','Instant email alert to student and owner on scan'],
                ['📋','Full history log viewable in student dashboard'],
              ].map(([e, t]) => (
                <div key={t} className="flex items-start gap-3 text-sm text-[#c9d1d9]">
                  <span className="mt-0.5 flex-shrink-0">{e}</span>{t}
                </div>
              ))}
            </div>
          </div>
          {/* QR mockup */}
          <div className="flex justify-center">
            <div className="bg-[#111527] border border-white/10 rounded-3xl p-8 text-center w-72 shadow-[0_20px_60px_rgba(79,110,247,0.15)]">
              <div className="text-sm text-[#7b82a8] mb-4 font-medium">My QR Code</div>
              <div className="relative w-48 h-48 mx-auto mb-4">
                <div className="absolute inset-0 bg-white rounded-2xl p-4 overflow-hidden">
                  <div className="w-full h-full grid grid-cols-10 gap-px">
                    {Array.from({ length: 100 }, (_, i) => (
                      <div key={i} className="rounded-sm" style={{ background: (i*7+i*3)%3===0?'#0d1117':'white', aspectRatio:1 }} />
                    ))}
                  </div>
                </div>
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-brand-500 to-transparent shadow-[0_0_8px_#4f6ef7] animate-scan pointer-events-none" />
              </div>
              <div className="font-syne font-bold text-white mb-1">Rahul Sharma</div>
              <div className="text-[#7b82a8] text-xs mb-4">Student · RentEase Verified</div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                <span className="text-accent-green text-xs font-semibold">Currently Inside</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TECH STACK ─── */}
      <section className="py-24 px-[5%] bg-[#0b0f1e]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-brand-500 text-xs font-bold uppercase tracking-[3px] mb-4">Tech Stack</div>
            <h2 className="font-syne font-extrabold text-[clamp(2rem,4vw,3rem)] mb-4">100% Free. Production grade.</h2>
            <p className="text-[#7b82a8] text-lg max-w-xl mx-auto">Every service has a generous free tier. Run the entire platform at zero cost up to ~10,000 users.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {TECH_STACK.map(({ name, role, color, icon }) => (
              <div key={name} className="glass bg-[#111527] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                <div className="text-2xl mb-3">{icon}</div>
                <div className="font-syne font-bold text-white mb-1">{name}</div>
                <div className="text-[#7b82a8] text-xs leading-relaxed mb-3">{role}</div>
                <span className="inline-flex text-xs font-semibold px-2 py-1 rounded-full" style={{ background:`${color}20`, color }}>
                  Free tier
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <Faq />

      {/* ─── CTA ─── */}
      <section className="relative py-32 px-[5%] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 via-accent-purple/10 to-accent-green/10" />
        <div className="absolute inset-0 grid-overlay opacity-40" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="font-syne font-extrabold text-[clamp(2.5rem,5vw,4rem)] leading-tight mb-6">
            Ready to simplify<br />
            <span className="gradient-text">student accommodation?</span>
          </h2>
          <p className="text-[#7b82a8] text-lg mb-10 max-w-xl mx-auto">
            Join thousands of students and property owners on RentEase. Free forever. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/sign-up?role=student" className="bg-gradient-to-r from-brand-500 to-accent-purple text-white font-bold text-lg px-8 py-4 rounded-2xl hover:opacity-90 transition-opacity shadow-[0_8px_30px_rgba(79,110,247,0.4)]">
              🎓 I'm a Student →
            </Link>
            <Link href="/sign-up?role=owner" className="bg-white/5 border border-white/20 text-white font-bold text-lg px-8 py-4 rounded-2xl hover:bg-white/10 transition-all">
              🏢 I'm an Owner →
            </Link>
          </div>
          <p className="text-[#7b82a8] text-sm mt-6">✓ Free forever &nbsp;·&nbsp; ✓ No credit card &nbsp;·&nbsp; ✓ Setup in 2 minutes</p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/5 py-10 px-[5%]">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-center gap-2 font-syne font-extrabold text-lg">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center text-sm">🏠</div>
            Rent<span className="text-brand-500">Ease</span>
          </div>
          <div className="text-[#7b82a8] text-sm text-center">Built with ❤️ in India &nbsp;·&nbsp; 100% Free Stack &nbsp;·&nbsp; Production Ready</div>
          <div className="flex items-center gap-4 text-sm text-[#7b82a8]">
            <Link href="/sign-in" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/sign-up" className="hover:text-white transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}