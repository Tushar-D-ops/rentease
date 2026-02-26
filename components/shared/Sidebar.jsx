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
  ],
  owner: [
    { label: 'Overview',    href: '/owner',             icon: '📊' },
    { label: 'Properties',  href: '/owner/properties',  icon: '🏢' },
    { label: 'Billing',     href: '/owner/billing',     icon: '💰' },
    { label: 'Electricity', href: '/owner/electricity', icon: '⚡' },
    { label: 'In/Out Logs', href: '/owner/inout-logs',  icon: '📲' },
    { label: 'Analytics',   href: '/owner/analytics',   icon: '📈' },
    { label: 'Disputes',    href: '/owner/disputes',    icon: '⚖️' },
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
      <div className="px-6 py-5 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center text-sm">🏠</div>
          <span className="font-syne font-bold text-lg">Rent<span className="text-brand-500">Ease</span></span>
        </Link>
        <div className="mt-2 text-xs font-semibold px-2 py-1 rounded-md w-fit" style={{ background: `${roleColor}20`, color: roleColor }}>
          {roleLabel} Portal
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== `/${role}` && pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <Link href={item.href} className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : 'text-[#7b82a8] hover:text-white hover:bg-white/5'
                )}>
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="px-4 py-4 border-t border-white/5 flex items-center gap-3">
        <UserButton afterSignOutUrl="/" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[#7b82a8]">Signed in as</div>
          <div className="text-sm font-medium truncate capitalize">{role}</div>
        </div>
      </div>
    </aside>
  )
}