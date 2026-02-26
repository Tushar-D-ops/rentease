'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

export default function CounterLandingPage(){
    function useCounter(target, inView) {
      const [value, setValue] = useState(0)
      useEffect(() => {
        if (!inView) return
        let start = 0
        const dur = 1800
        const step = target / (dur / 16)
        const timer = setInterval(() => {
          start += step
          if (start >= target) { setValue(target); clearInterval(timer) }
          else setValue(Math.floor(start))
        }, 16)
        return () => clearInterval(timer)
      }, [inView, target])
      return value
    }
    
    function Counter({ target, suffix = '', prefix = '' }) {
      const ref = useRef(null)
      const [inView, setInView] = useState(false)
      const value = useCounter(target, inView)
      useEffect(() => {
        const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold: 0.3 })
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
      }, [])
      return <span ref={ref}>{prefix}{value.toLocaleString('en-IN')}{suffix}</span>
    }
    return(
    <section className="py-16 px-[5%] border-y border-white/5 bg-[#0b0f1e]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { target:12400, suffix:'+', label:'Students Housed' },
            { target:850,   suffix:'+', label:'Verified PGs' },
            { target:99,    suffix:'%', label:'Payment Success Rate' },
            { target:4,     suffix:' sec', label:'Avg QR Scan Time' },
          ].map(({ target, suffix, label }) => (
            <div key={label}>
              <div className="font-syne font-extrabold text-[clamp(1.8rem,4vw,2.8rem)] gradient-text">
                <Counter target={target} suffix={suffix} />
              </div>
              <div className="text-[#7b82a8] text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>
    )
}