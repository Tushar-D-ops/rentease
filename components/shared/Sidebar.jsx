'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'

export default function Sidebar({ role = 'student' }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const NAV_ITEMS = {
    student: [
      { label: 'Overview', href: '/student', icon: '🏠' },
      { label: 'Find PGs', href: '/student/properties', icon: '🔍' },
      { label: 'Payments', href: '/student/payments', icon: '💳' },
      { label: 'My QR Code', href: '/student/qr', icon: '📲' },
      { label: 'Attendance', href: '/student/attendance', icon: '📋' },
      { label: 'Disputes', href: '/student/disputes', icon: '⚖️' },
      { label: 'Referrals', href: '/student/referrals', icon: '🎁' },
      { label: 'AI Assistant', href: '/student/ai-chat', icon: '🤖' },
      { label: 'My Profile', href: '/student/profile', icon: '👤' },
    ],
    owner: [
      { label: 'Overview', href: '/owner', icon: '📊' },
      { label: 'Properties', href: '/owner/properties', icon: '🏢' },
      { label: 'Bookings', href: '/owner/enrollments', icon: '📥' },
      { label: 'Billing', href: '/owner/billing', icon: '💰' },
      { label: 'Electricity', href: '/owner/electricity', icon: '⚡' },
      { label: 'QR Scanner', href: '/owner/scanner', icon: '📷' },
      { label: 'In/Out Logs', href: '/owner/inout-logs', icon: '📲' },
      { label: 'Analytics', href: '/owner/analytics', icon: '📈' },
      { label: 'Disputes', href: '/owner/disputes', icon: '⚖️' },
    ],
    admin: [
      { label: 'Overview', href: '/admin', icon: '⚙️' },
      { label: 'Properties', href: '/admin/properties', icon: '🏢' },
      { label: 'Users', href: '/admin/users', icon: '👥' },
      { label: 'Disputes', href: '/admin/disputes', icon: '⚖️' },
      { label: 'Revenue', href: '/admin/revenue', icon: '💰' },
      { label: 'Fraud Monitor', href: '/admin/fraud', icon: '🛡️' },
    ],
  }

  const navItems = NAV_ITEMS[role] || []

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 bg-[#0b0f1e] border-b border-white/5 z-40">
        <button onClick={() => setMobileOpen(true)} className="text-white text-xl">☰</button>
        <div className="font-semibold text-white text-sm">RentEase</div>
        <UserButton afterSignOutUrl="/" />
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static top-0 left-0 h-screen z-50 sidebar-glass flex flex-col transition-all duration-300",
          collapsed ? "w-20" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center text-lg">🏠</div>
              <div className="font-syne font-bold text-white text-sm">RentEase</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block text-[#7b82a8] hover:text-white text-sm"
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(({ label, href, icon }) => {
            const active =
              pathname === href ||
              (href !== `/${role}` && pathname.startsWith(href))

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-brand-500/15 text-brand-300 border border-brand-500/20"
                    : "text-[#7b82a8] hover:text-white hover:bg-white/5"
                )}
              >
                <span className="text-base">{icon}</span>
                {!collapsed && <span>{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/5 flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          {!collapsed && <span className="text-xs text-[#7b82a8]">Account</span>}
        </div>
      </aside>
    </>
  )
}