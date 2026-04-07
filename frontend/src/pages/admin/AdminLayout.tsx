import { Outlet, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { Users, Home, FileText, MapPin, LogOut, KeyRound, LayoutDashboard, UserCog, Share2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import SiteNav from '../../components/layout/SiteNav'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

export default function AdminLayout() {
  const { session, logout } = useAuth()
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
      isActive
        ? 'bg-[#1e293b] text-white'
        : 'text-slate-300 hover:bg-[#1e293b] hover:text-white'
    }`

  return (
    <div className="flex flex-col min-h-screen font-sans">
      <SiteNav />
      <div className="flex flex-1">
      {/* Sidebar */}
      <aside className="w-56 bg-[#0f172a] text-white flex flex-col shrink-0 sticky top-[65px] h-[calc(100vh-65px)]">
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
          <NavLink to="/admin/social-media" className={navClass}>
            <Share2 size={18} />
            Social Media
          </NavLink>
          <NavLink to="/admin/users" className={navClass}>
            <UserCog size={18} />
            User Management
          </NavLink>
        </nav>

        {/* User + Sign out */}
        <div className="p-3 border-t border-slate-700 space-y-1">
          {session.userName && (
            <p className="px-4 py-2 text-xs text-slate-400 truncate">
              Signed in as <span className="text-white font-medium">{session.userName}</span>
            </p>
          )}
          <button
            onClick={() => setLogoutConfirmOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-[#1e293b]"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-slate-50 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Sign out?"
        message="Are you sure you want to sign out of your account?"
        confirmLabel="Sign Out"
        isDanger={false}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={async () => {
          setLogoutConfirmOpen(false)
          await logout()
        }}
      />
    </div>
  )
}
