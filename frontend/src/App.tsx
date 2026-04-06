import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import './App.css'

interface ImpactSummary {
  latestSnapshot: {
    snapshotId: number
    snapshotDate: string
    headline: string
    summaryText: string
    isPublished: boolean
  } | null
  activeSafehouses: number
  totalResidents: number
}

function App() {
  const [impact, setImpact] = useState<ImpactSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch('/api/impact/summary')
      .then(setImpact)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <div className="home">
      {/* Hero */}
      <header className="hero">
        <div className="hero-content">
          <h1>Lighthouse Sanctuary</h1>
          <p className="tagline">
            Protecting and restoring the lives of girl survivors of abuse and trafficking.
          </p>
          <a href="/donate" className="btn-primary">Support Our Mission</a>
        </div>
      </header>

      {/* Stats from DB */}
      <section className="stats">
        <h2>Our Impact</h2>
        {error && <p className="error">Could not load data: {error}</p>}
        {!impact && !error && <p className="loading">Loading...</p>}
        {impact && (
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-number">{impact.totalResidents}</span>
              <span className="stat-label">Residents Currently Served</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{impact.activeSafehouses}</span>
              <span className="stat-label">Active Safe Houses</span>
            </div>
            {impact.latestSnapshot && (
              <div className="stat-card wide">
                <span className="stat-label">Latest Update</span>
                <p className="stat-summary">{impact.latestSnapshot.summaryText}</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Mission */}
      <section className="mission">
        <h2>What We Do</h2>
        <div className="mission-grid">
          <div className="mission-card">
            <h3>Safe Homes</h3>
            <p>We operate secure, caring residential facilities where survivors can heal away from danger.</p>
          </div>
          <div className="mission-card">
            <h3>Counseling</h3>
            <p>Licensed social workers provide individual and group therapy tailored to each resident's journey.</p>
          </div>
          <div className="mission-card">
            <h3>Reintegration</h3>
            <p>We prepare residents for a safe return to family or independent living with ongoing support.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <h2>Make a Difference Today</h2>
        <p>Your donation provides food, shelter, education, and hope for survivors.</p>
        <a href="/donate" className="btn-primary">Donate Now</a>
        <a href="/login" className="btn-secondary">Staff Login</a>
      </section>

      <footer className="footer">
        <p>&copy; 2026 Lighthouse Sanctuary. All rights reserved.</p>
        <a href="/privacy">Privacy Policy</a>
      </footer>
    </div>
  )
}

export default App
