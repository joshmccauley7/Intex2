import { Outlet, NavLink } from 'react-router-dom'
import { Heart, Users, Home, FileText, MapPin, KeyRound, LayoutDashboard } from 'lucide-react'

export default function AdminLayout() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
      isActive
        ? 'bg-[#1e293b] text-white'
        : 'text-slate-300 hover:bg-[#1e293b] hover:text-white'
    }`

  return (
    <div className="flex min-h-screen font-sans">
      {/* Sidebar */}
      <aside className="w-56 bg-[#0f172a] text-white flex flex-col shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 font-bold text-xl px-4 py-5 border-b border-slate-700">
          <Heart className="text-safira-blue fill-safira-blue" size={20} />
          Safira
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-3 flex-1">
          <NavLink to="/admin/dashboard" className={navClass}>
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>
          <NavLink to="/admin/donors" className={navClass}>
            <Users size={18} />
            Donors
          </NavLink>
          <NavLink to="/admin/residents" className={navClass}>
            <Home size={18} />
            Residents
          </NavLink>
          <NavLink to="/admin/process-recordings" className={navClass}>
            <FileText size={18} />
            Process Recordings
          </NavLink>
          <NavLink to="/admin/home-visitations" className={navClass}>
            <MapPin size={18} />
            Home Visitations
          </NavLink>
          <NavLink to="/admin/stripe" className={navClass}>
            <KeyRound size={18} />
            Stripe
          </NavLink>
        </nav>

        {/* Back to site */}
        <div className="p-3 border-t border-slate-700">
          <a
            href="/"
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-[#1e293b]"
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
