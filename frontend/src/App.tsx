import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CookieConsentProvider } from './context/CookieConsentProvider';
import { ThemeProvider } from './context/ThemeProvider';
import CookieBanner from './components/cookies/CookieBanner';
import CookieSettingsModal from './components/cookies/CookieSettingsModal';
import AnalyticsConsentBridge from './components/cookies/AnalyticsConsentBridge';
import HomePage from './pages/Home';
import ImpactDashboard from './pages/ImpactDashboard';
import DonatePage from './pages/DonatePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import AdminLayout from './pages/admin/AdminLayout';
import DonorsPage from './pages/admin/DonorsPage';
import ResidentsPage from './pages/admin/ResidentsPage';
import ProcessRecordingsPage from './pages/admin/ProcessRecordingsPage';
import HomeVisitationsPage from './pages/admin/HomeVisitationsPage';
import StripeSettingsPage from './pages/admin/StripeSettingsPage';

export default function App() {
  return (
    <CookieConsentProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AnalyticsConsentBridge />
          <CookieBanner />
          <CookieSettingsModal />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/impact" element={<ImpactDashboard />} />
            <Route path="/donate" element={<DonatePage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="donors" element={<DonorsPage />} />
              <Route path="residents" element={<ResidentsPage />} />
              <Route path="process-recordings" element={<ProcessRecordingsPage />} />
              <Route path="home-visitations" element={<HomeVisitationsPage />} />
              <Route path="stripe" element={<StripeSettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </CookieConsentProvider>
  );
}
