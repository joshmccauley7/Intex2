import { Outlet, NavLink } from 'react-router-dom'
import { Heart, Users, Home } from 'lucide-react'

export default function AdminLayout() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
      isActive
        ? 'bg-navy-light text-white'
        : 'text-slate-300 hover:bg-navy-light hover:text-white'
    }`

  return (
    <div className="flex min-h-screen font-sans">
      {/* Sidebar */}
      <aside className="w-56 bg-navy-DEFAULT text-white flex flex-col shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 font-bold text-xl px-4 py-5 border-b border-slate-700">
          <Heart className="text-safira-blue fill-safira-blue" size={20} />
          Safira
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-3 flex-1">
          <NavLink to="/admin/donors" className={navClass}>
            <Users size={18} />
            Donors
          </NavLink>
          <NavLink to="/admin/residents" className={navClass}>
            <Home size={18} />
            Residents
          </NavLink>
        </nav>

        {/* Back to site */}
        <div className="p-3 border-t border-slate-700">
          <a
            href="/"
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-navy-light"
          >
            ← Back to Site
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-slate-50 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
