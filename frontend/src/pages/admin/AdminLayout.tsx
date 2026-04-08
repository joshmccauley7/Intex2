import { Outlet, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { Users, Home, FileText, MapPin, LogOut, KeyRound, LayoutDashboard, UserCog, Share2, Menu, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import SiteNav from '../../components/layout/SiteNav'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

export default function AdminLayout() {
  const { session, logout } = useAuth()
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
      isActive
        ? 'bg-[#1e293b] text-white'
        : 'text-slate-300 hover:bg-[#1e293b] hover:text-white'
    }`

  return (
    <div className="flex flex-col min-h-screen font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <SiteNav />
      <div className="flex flex-1">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-[#0f172a] text-white flex-col shrink-0 sticky top-[65px] h-[calc(100vh-65px)]">
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
      <main className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 md:p-8 overflow-auto">
        <div className="md:hidden mb-4">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0f172a] dark:bg-slate-800 px-3 py-2 text-sm font-medium text-white shadow-sm"
            aria-label="Open admin navigation"
            aria-expanded={mobileNavOpen}
            aria-controls="admin-mobile-nav"
          >
            <Menu size={18} />
            Menu
          </button>
        </div>
        <Outlet />
      </main>
    </div>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/45"
            aria-label="Close admin navigation"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside
            id="admin-mobile-nav"
            className="relative z-10 h-full w-72 max-w-[85vw] bg-[#0f172a] text-white flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-slate-700 p-3">
              <p className="text-sm font-semibold tracking-wide text-slate-200">Admin Menu</p>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-lg p-2 text-slate-300 hover:bg-[#1e293b] hover:text-white"
                aria-label="Close admin navigation"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex flex-col gap-1 p-3 flex-1">
              <NavLink to="/admin/dashboard" className={navClass} onClick={() => setMobileNavOpen(false)}>
                <LayoutDashboard size={18} />
                Dashboard
              </NavLink>
              <NavLink to="/admin/donors" className={navClass} onClick={() => setMobileNavOpen(false)}>
                <Users size={18} />
                Donors
              </NavLink>
              <NavLink to="/admin/residents" className={navClass} onClick={() => setMobileNavOpen(false)}>
                <Home size={18} />
                Residents
              </NavLink>
              <NavLink to="/admin/process-recordings" className={navClass} onClick={() => setMobileNavOpen(false)}>
                <FileText size={18} />
                Process Recordings
              </NavLink>
              <NavLink to="/admin/home-visitations" className={navClass} onClick={() => setMobileNavOpen(false)}>
                <MapPin size={18} />
                Home Visitations
              </NavLink>
              <NavLink to="/admin/stripe" className={navClass} onClick={() => setMobileNavOpen(false)}>
                <KeyRound size={18} />
                Stripe
              </NavLink>
              <NavLink to="/admin/social-media" className={navClass} onClick={() => setMobileNavOpen(false)}>
                <Share2 size={18} />
                Social Media
              </NavLink>
              <NavLink to="/admin/users" className={navClass} onClick={() => setMobileNavOpen(false)}>
                <UserCog size={18} />
                User Management
              </NavLink>
            </nav>

            <div className="p-3 border-t border-slate-700 space-y-1">
              {session.userName && (
                <p className="px-4 py-2 text-xs text-slate-400 truncate">
                  Signed in as <span className="text-white font-medium">{session.userName}</span>
                </p>
              )}
              <button
                onClick={() => {
                  setMobileNavOpen(false)
                  setLogoutConfirmOpen(true)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-[#1e293b]"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

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
