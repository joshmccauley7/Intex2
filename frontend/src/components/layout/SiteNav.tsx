import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import faviconImg from '/favicon.ico';
import ThemeToggle from '../theme/ThemeToggle';
import { useAuth } from '../../context/AuthContext';

export default function SiteNav() {
  const { session, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'text-white hover:text-blue-400 transition-colors'
      : 'text-slate-300 hover:text-white transition-colors';

  return (
    <nav className="bg-[#0f172a] dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-slate-800/80">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 font-bold text-xl shrink-0">
        <img src={faviconImg} alt="Safira logo" style={{ width: 22, height: 22 }} />
        Safira
      </Link>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-8 text-sm font-medium">
        <NavLink to="/" end className={linkClass}>Home</NavLink>
        <NavLink to="/impact" className={linkClass}>Impact</NavLink>
        <NavLink to="/donate" className={linkClass}>Donate</NavLink>
        {isAdmin && (
          <NavLink to="/admin/dashboard" className={linkClass}>Admin</NavLink>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {session.isAuthenticated ? (
          <>
            <Link
              to="/profile"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-slate-800"
            >
              {session.userName}
            </Link>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors px-2 py-2 rounded-lg hover:bg-slate-800"
            >
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="text-sm font-semibold text-white bg-safira-blue hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
