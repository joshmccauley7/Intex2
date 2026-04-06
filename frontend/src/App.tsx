import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/Home'
import ImpactDashboard from './pages/ImpactDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/impact" element={<ImpactDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
