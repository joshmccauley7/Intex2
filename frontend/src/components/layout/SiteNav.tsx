import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LogOut, Globe, Menu, X } from 'lucide-react';
import navLogoImg from '../../images/background.jpg';
import ThemeToggle from '../theme/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import ConfirmDialog from '../ui/ConfirmDialog';

export default function SiteNav() {
  const { session, isAdmin, isDonor, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  function handleTranslateClick() {
    const rawUrl = window.location.href;
    const isLocalHost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1';

    if (isLocalHost) {
      // Google Translate cannot fetch localhost/private URLs.
      alert('Google Translate cannot open local development pages. Use a deployed URL to translate the full page.');
      return;
    }

    const url = encodeURIComponent(rawUrl);
    const translateUrl = `https://translate.google.com/?sl=auto&tl=fil&op=websites&url=${url}`;
    const opened = window.open(translateUrl, '_blank', 'noopener,noreferrer');

    // Fallback when popup blockers prevent opening a new tab.
    if (!opened) {
      window.location.href = translateUrl;
    }
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'text-safira-blue dark:text-blue-300 transition-colors'
      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors';

  const roleLabel = isAdmin ? 'Admin' : isDonor ? 'Donor' : null;
  const roleBadgeClass = isAdmin
    ? 'bg-blue-600 text-white'
    : 'bg-emerald-600 text-white';

  return (
    <nav className="bg-white/95 dark:bg-[#13264f]/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 supports-[backdrop-filter]:dark:bg-[#13264f]/90 text-slate-900 dark:text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-slate-200 dark:border-[#2a3d63] shadow-sm">
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

      {/* Right side (desktop) */}
      <div className="hidden md:flex items-center gap-2">
        <button
          onClick={handleTranslateClick}
          title="Translate this page"
          className="flex items-center text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Globe size={16} />
        </button>
        <ThemeToggle />
        {session.isAuthenticated ? (
          <>
            <Link
              to="/profile"
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
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
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
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

      {/* Mobile controls */}
      <div className="md:hidden flex items-center gap-2">
        <button
          onClick={handleTranslateClick}
          title="Translate this page"
          className="flex items-center text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Globe size={16} />
        </button>
        <ThemeToggle />
        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="flex items-center text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-site-nav-menu"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-site-nav-menu"
          className="md:hidden absolute left-0 right-0 top-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-4 shadow-xl"
        >
          <div className="flex flex-col gap-1 text-sm font-medium">
            <NavLink to="/" end className={linkClass} onClick={() => setMobileMenuOpen(false)}>Home</NavLink>
            <NavLink to="/impact" className={linkClass} onClick={() => setMobileMenuOpen(false)}>Impact</NavLink>
            <NavLink to="/donate" className={linkClass} onClick={() => setMobileMenuOpen(false)}>Donate</NavLink>
            {session.isAuthenticated && (
              <NavLink to="/my-donations" className={linkClass} onClick={() => setMobileMenuOpen(false)}>
                My Donations
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin/dashboard" className={linkClass} onClick={() => setMobileMenuOpen(false)}>
                Admin Tools
              </NavLink>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
            {session.isAuthenticated ? (
              <div className="flex items-center justify-between gap-3">
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {session.userName}
                  {roleLabel && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleBadgeClass}`}>
                      {roleLabel}
                    </span>
                  )}
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setLogoutConfirmOpen(true);
                  }}
                  title="Sign out"
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex text-sm font-semibold text-white bg-safira-blue hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
              >
                Login
              </Link>
            )}
          </div>
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
          setLogoutConfirmOpen(false);
          await handleLogout();
        }}
      />
    </nav>
  );
}
