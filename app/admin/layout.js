import Sidebar from '@/components/shared/Sidebar'
import { requireRole } from '@/app/layout-guard'

export default async function AdminLayout({ children }) {
  await requireRole('admin')
  return (
    <div className="flex min-h-screen bg-[#050810]">
      <Sidebar role="admin" />
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">{children}</div>
      </main>
    </div>
  )
}