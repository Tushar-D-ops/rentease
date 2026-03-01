import Sidebar from '@/components/shared/Sidebar'
import { requireRole } from '@/app/layout-guard'

export default async function StudentLayout({ children }) {
  await requireRole('student')
  return (
    <div className="flex h-screen bg-[#050810] overflow-hidden">
    
          <Sidebar role="student" />
    
          <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
              {children}
            </div>
          </main>
    
        </div>
  )
}