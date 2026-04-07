import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import AdminLayout from './pages/admin/AdminLayout.tsx'
import DonorsPage from './pages/admin/DonorsPage.tsx'
import ResidentsPage from './pages/admin/ResidentsPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="donors" element={<DonorsPage />} />
          <Route path="residents" element={<ResidentsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
