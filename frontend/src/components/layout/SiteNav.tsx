import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LogOut, Globe } from 'lucide-react';
import navLogoImg from '../../images/background.jpg';
import ThemeToggle from '../theme/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import ConfirmDialog from '../ui/ConfirmDialog';

export default function SiteNav() {
  const { session, isAdmin, isDonor, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'text-white hover:text-blue-400 transition-colors'
      : 'text-slate-300 hover:text-white transition-colors';

  const roleLabel = isAdmin ? 'Admin' : isDonor ? 'Donor' : null;
  const roleBadgeClass = isAdmin
    ? 'bg-blue-600 text-white'
    : 'bg-emerald-600 text-white';

  return (
    <nav className="bg-[#0f172a] dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-slate-800/80">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 font-bold text-xl shrink-0">
        <img src={navLogoImg} alt="Safira logo" style={{ width: 22, height: 22, objectFit: 'cover', borderRadius: '4px' }} />
        Safira
      </Link>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-8 text-sm font-medium">
        <NavLink to="/" end className={linkClass}>Home</NavLink>
        <NavLink to="/impact" className={linkClass}>Impact</NavLink>
        <NavLink to="/donate" className={linkClass}>Donate</NavLink>
        {session.isAuthenticated && (
          <NavLink to="/my-donations" className={linkClass}>My Donations</NavLink>
        )}
        {isAdmin && (
          <NavLink to="/admin/dashboard" className={linkClass}>Admin Tools</NavLink>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            const url = encodeURIComponent(window.location.href);
            window.open(`https://translate.google.com/translate?sl=en&u=${url}`, '_blank');
          }}
          title="Translate this page"
          className="flex items-center text-slate-300 hover:text-white transition-colors px-2 py-2 rounded-lg hover:bg-slate-800"
        >
          <Globe size={16} />
        </button>
        <ThemeToggle />
        {session.isAuthenticated ? (
          <>
            <Link
              to="/profile"
              className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-slate-800"
            >
              {session.userName}
              {roleLabel && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleBadgeClass}`}>
                  {roleLabel}
                </span>
              )}
            </Link>
            <button
              onClick={() => setLogoutConfirmOpen(true)}
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
      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Sign out?"
        message="Are you sure you want to sign out of your account?"
        confirmLabel="Sign Out"
        isDanger={false}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={async () => {
          setLogoutConfirmOpen(false);
          await handleLogout();
        }}
      />
    </nav>
  );
}
