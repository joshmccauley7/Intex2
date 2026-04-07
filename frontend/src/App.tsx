import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { CookieConsentProvider } from './context/CookieConsentProvider';
import { ThemeProvider } from './context/ThemeProvider';
import { AuthProvider, useAuth } from './context/AuthContext';
import CookieBanner from './components/cookies/CookieBanner';
import CookieSettingsModal from './components/cookies/CookieSettingsModal';
import AnalyticsConsentBridge from './components/cookies/AnalyticsConsentBridge';
import HomePage from './pages/Home';
import ImpactDashboard from './pages/ImpactDashboard';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import DonorsPage from './pages/admin/DonorsPage';
import ResidentsPage from './pages/admin/ResidentsPage';
import ProcessRecordingsPage from './pages/admin/ProcessRecordingsPage';
import HomeVisitationsPage from './pages/admin/HomeVisitationsPage';

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isLoading, isAdmin } = useAuth();
  if (isLoading) return null; // wait for session check before redirecting
  if (!isAdmin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <CookieConsentProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <AnalyticsConsentBridge />
            <CookieBanner />
            <CookieSettingsModal />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/impact" element={<ImpactDashboard />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/admin"
                element={
                  <RequireAdmin>
                    <AdminLayout />
                  </RequireAdmin>
                }
              >
                <Route path="donors" element={<DonorsPage />} />
                <Route path="residents" element={<ResidentsPage />} />
                <Route path="process-recordings" element={<ProcessRecordingsPage />} />
                <Route path="home-visitations" element={<HomeVisitationsPage />} />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </CookieConsentProvider>
  );
}
