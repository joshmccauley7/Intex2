import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { User, Shield, LogOut } from 'lucide-react';
import SiteNav from '../components/layout/SiteNav';
import SiteFooter from '../components/layout/SiteFooter';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function ProfilePage() {
  const { session, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <SiteNav />

      <main className="flex-1 flex items-start justify-center px-4 py-16">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-8">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-full bg-safira-blue flex items-center justify-center mb-4">
              <User size={36} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#0f172a] dark:text-white">
              {session.userName}
            </h1>
            {isAdmin && (
              <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-300 px-3 py-1 rounded-full">
                <Shield size={12} />
                Admin
              </span>
            )}
          </div>

          {/* Info */}
          <div className="space-y-3 mb-8">
            <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-500">Username</span>
              <span className="text-sm font-medium text-[#0f172a] dark:text-white">{session.userName}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-500">Role</span>
              <span className="text-sm font-medium text-[#0f172a] dark:text-white capitalize">
                {session.roles.length > 0 ? session.roles.join(', ') : 'User'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {isAdmin && (
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="w-full bg-safira-blue hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                Go to Admin Portal
              </button>
            )}
            <button
              onClick={() => setLogoutConfirmOpen(true)}
              className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </main>

      <SiteFooter />
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
    </div>
  );
}
