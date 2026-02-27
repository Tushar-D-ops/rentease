'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'

const NAV_ITEMS = {
  student: [
  { label: 'Overview',     href: '/student',             icon: '🏠' },
  { label: 'Find PGs',     href: '/student/properties',  icon: '🔍' },
  { label: 'Payments',     href: '/student/payments',    icon: '💳' },
  { label: 'My QR Code',   href: '/student/qr',          icon: '📲' },
  { label: 'Attendance',   href: '/student/attendance',  icon: '📋' },
  { label: 'Disputes',     href: '/student/disputes',    icon: '⚖️' },
  { label: 'Referrals',    href: '/student/referrals',   icon: '🎁' },
  { label: 'AI Assistant', href: '/student/ai-chat',     icon: '🤖' },
  { label: 'My Profile',   href: '/student/profile',     icon: '👤' },
],
  owner: [
    { label: 'Overview',      href: '/owner',               icon: '📊' },
    { label: 'Properties',    href: '/owner/properties',    icon: '🏢' },
    { label: 'Bookings',      href: '/owner/enrollments',   icon: '📥' },
    { label: 'Billing',       href: '/owner/billing',       icon: '💰' },
    { label: 'Electricity',   href: '/owner/electricity',   icon: '⚡' },
    { label: 'QR Scanner',    href: '/owner/scanner',       icon: '📷' },
    { label: 'In/Out Logs',   href: '/owner/inout-logs',    icon: '📲' },
    { label: 'Analytics',     href: '/owner/analytics',     icon: '📈' },
    { label: 'Disputes',      href: '/owner/disputes',      icon: '⚖️' },
    
  ],
  admin: [
    { label: 'Overview',      href: '/admin',           icon: '⚙️' },
    { label: 'Properties',    href: '/admin/properties', icon: '🏢' },
    { label: 'Users',         href: '/admin/users',      icon: '👥' },
    { label: 'Disputes',      href: '/admin/disputes',   icon: '⚖️' },
    { label: 'Revenue',       href: '/admin/revenue',    icon: '💰' },
    { label: 'Fraud Monitor', href: '/admin/fraud',      icon: '🛡️' },
  ],
}

export default function Sidebar({ role = 'student' }) {
  const pathname = usePathname()
  const navItems = NAV_ITEMS[role] || []
  const roleLabel = { student: 'Student', owner: 'Owner', admin: 'Admin' }[role]
  const roleColor = { student: '#4f6ef7', owner: '#06d6a0', admin: '#f5a623' }[role]

  return (
    <aside className="w-64 h-screen sticky top-0 flex flex-col border-r border-white/5 bg-[#0b0f1e]">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center text-lg">🏠</div>
          <div>
            <div className="font-syne font-bold text-white text-sm">RentEase</div>
            <div className="text-xs font-medium" style={{ color: roleColor }}>{roleLabel}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map(({ label, href, icon }) => {
          const active = pathname === href || (href !== `/${role}` && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-brand-500/15 text-brand-300 border border-brand-500/20'
                  : 'text-[#7b82a8] hover:text-white hover:bg-white/5'
              )}>
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <div className="text-xs text-[#7b82a8]">Account</div>
        </div>
      </div>
    </aside>
  )
}