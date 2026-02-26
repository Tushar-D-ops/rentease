import Sidebar from '@/components/shared/Sidebar'
import { requireRole } from '@/app/layout-guard'

export default async function OwnerLayout({ children }) {
  await requireRole('owner')
  return (
    <div className="flex h-screen bg-[#050810] overflow-hidden">
      <Sidebar role="owner" />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  )
}