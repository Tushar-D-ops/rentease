
import Link from 'next/link'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'

export default async function Navbar() {
  const { userId } = await auth()

  let role = null

  if (userId) {
    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)
    role = user.publicMetadata?.role
  }

  const dashboardRoute =
    role === 'student'
      ? '/student'
      : role === 'owner'
      ? '/owner'
      : role === 'admin'
      ? '/admin'
      : null

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-[5%] h-[68px] bg-[rgba(5,8,16,0.9)] backdrop-blur-xl border-b border-white/5">

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 font-syne font-extrabold text-[1.4rem] text-white">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center text-sm">
          🏠
        </div>
        Rent<span className="text-brand-500">Ease</span>
      </Link>

      {/* Middle Links */}
      <div className="hidden md:flex items-center gap-1 text-sm">
        {['#features','#how','#students','#billing','#qr'].map((href, i) => (
          <a key={href} href={href} className="px-4 py-2 text-[#7b82a8] hover:text-white rounded-lg hover:bg-white/5 transition-all">
            {['Features','How it works','Roles','Billing','QR System'][i]}
          </a>
        ))}
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">

        {!userId && (
          <>
            <Link
              href="/sign-in"
              className="text-[#7b82a8] hover:text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/5 transition-all"
            >
              Sign in
            </Link>

            <Link
              href="/sign-up"
              className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              Get Started →
            </Link>
          </>
        )}

        {userId && dashboardRoute && (
          <>
          
          <Link
            href={dashboardRoute}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            Go to Dashboard →
          </Link>
          <UserButton afterSignOutUrl="/" />
          </>
        )}

      </div>
    </nav>
  )
}