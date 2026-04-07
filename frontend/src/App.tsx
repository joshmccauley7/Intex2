import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { CookieConsentProvider } from './context/CookieConsentProvider';
import { ThemeProvider } from './context/ThemeProvider';
import { AuthProvider, useAuth } from './context/AuthContext';
import CookieBanner from './components/cookies/CookieBanner';
import CookieSettingsModal from './components/cookies/CookieSettingsModal';
import AnalyticsConsentBridge from './components/cookies/AnalyticsConsentBridge';
import HomePage from './pages/Home';
import ImpactDashboard from './pages/ImpactDashboard';
import DonatePage from './pages/DonatePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import DonationHistoryPage from './pages/DonationHistoryPage';
import AdminLayout from './pages/admin/AdminLayout';
import DonorsPage from './pages/admin/DonorsPage';
import ResidentsPage from './pages/admin/ResidentsPage';
import ProcessRecordingsPage from './pages/admin/ProcessRecordingsPage';
import HomeVisitationsPage from './pages/admin/HomeVisitationsPage';
import StripeSettingsPage from './pages/admin/StripeSettingsPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import UserManagementPage from './pages/admin/UserManagementPage';

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isLoading, isAdmin } = useAuth();
  if (isLoading) return null;
  if (!isAdmin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoading, session } = useAuth();
  if (isLoading) return null;
  if (!session.isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <CookieConsentProvider>
      <ThemeProvider>
        <AuthProvider>
        <BrowserRouter>
          <AnalyticsConsentBridge />
          <CookieBanner />
          <CookieSettingsModal />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/impact" element={<ImpactDashboard />} />
            <Route path="/donate" element={<DonatePage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route
              path="/my-donations"
              element={
                <RequireAuth>
                  <DonationHistoryPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="donors" element={<DonorsPage />} />
              <Route path="residents" element={<ResidentsPage />} />
              <Route path="process-recordings" element={<ProcessRecordingsPage />} />
              <Route path="home-visitations" element={<HomeVisitationsPage />} />
              <Route path="stripe" element={<StripeSettingsPage />} />
              <Route path="users" element={<UserManagementPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </CookieConsentProvider>
  );
}
