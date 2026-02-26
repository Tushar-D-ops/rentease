import Sidebar from '@/components/shared/Sidebar'
export default function StudentLayout({ children }) {
  return (
    <div className="flex h-screen bg-[#050810] overflow-hidden">
      <Sidebar role="student" />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  )
}