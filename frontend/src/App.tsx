import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CookieConsentProvider } from './context/CookieConsentProvider';
import { ThemeProvider } from './context/ThemeProvider';
import CookieBanner from './components/cookies/CookieBanner';
import CookieSettingsModal from './components/cookies/CookieSettingsModal';
import AnalyticsConsentBridge from './components/cookies/AnalyticsConsentBridge';
import HomePage from './pages/Home';
import ImpactDashboard from './pages/ImpactDashboard';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';

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
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </CookieConsentProvider>
  );
}
