import { useEffect, useState } from 'react'
import { Heart, Users, Home, Shield, Quote } from 'lucide-react'
import { apiFetch } from './api'
import heroImg from './assets/hero.png'

interface ImpactSummary {
  latestSnapshot: {
    snapshotId: number
    snapshotDate: string
    summaryText: string
  } | null
  activeSafehouses: number
  totalResidents: number
}

function App() {
  const [impact, setImpact] = useState<ImpactSummary | null>(null)

  useEffect(() => {
    apiFetch('/api/impact/summary').then(setImpact).catch(() => null)
  }, [])

  return (
    <div className="min-h-screen flex flex-col font-sans">

      {/* Navbar */}
      <nav className="bg-navy-DEFAULT text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Heart className="text-safira-blue fill-safira-blue" size={22} />
          Safira
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="/" className="text-white hover:text-blue-400 transition-colors">Home</a>
          <a href="/about" className="hover:text-white transition-colors">About</a>
          <a href="/donate" className="hover:text-white transition-colors">Donate</a>
          <a href="/contact" className="hover:text-white transition-colors">Contact</a>
        </div>
        <a
          href="/donate"
          className="flex items-center gap-2 bg-safira-blue hover:bg-safira-blue-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Heart size={16} className="fill-white" />
          Donate Now
        </a>
      </nav>

      {/* Hero */}
      <section
        className="relative text-white text-center py-28 px-6 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImg})` }}
      >
        <div className="absolute inset-0 bg-navy-DEFAULT/70" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h1 className="text-5xl font-bold leading-tight mb-4">
            Every Child Deserves Safety
          </h1>
          <p className="text-lg text-slate-300 mb-8">
            Safira protects children who are victims of sexual abuse, providing shelter, healing, and a path to a brighter future.
          </p>
          <a
            href="/donate"
            className="inline-flex items-center gap-2 bg-safira-blue hover:bg-safira-blue-dark text-white font-semibold px-8 py-3 rounded-lg transition-colors text-base"
          >
            <Heart size={18} className="fill-white" />
            Donate Now
          </a>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-100">
            <Users className="mx-auto mb-3 text-safira-blue" size={28} />
            <div className="text-4xl font-bold text-navy-DEFAULT mb-1">
              {impact ? `${impact.totalResidents}+` : '—'}
            </div>
            <div className="text-sm text-slate-500 font-medium">Children Served</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-100">
            <Home className="mx-auto mb-3 text-safira-blue" size={28} />
            <div className="text-4xl font-bold text-navy-DEFAULT mb-1">
              {impact ? impact.activeSafehouses : '—'}
            </div>
            <div className="text-sm text-slate-500 font-medium">Safe Shelters</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-100">
            <Shield className="mx-auto mb-3 text-safira-blue" size={28} />
            <div className="text-4xl font-bold text-navy-DEFAULT mb-1">4+</div>
            <div className="text-sm text-slate-500 font-medium">Years of Impact</div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-slate-50 py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-navy-DEFAULT mb-6">Our Mission</h2>
          <p className="text-slate-600 leading-relaxed text-base">
            Safira exists to rescue, shelter, and rehabilitate children who have suffered sexual
            abuse. We provide safe housing, trauma-informed care, educational support, and legal
            advocacy — empowering survivors to heal and reclaim their futures. Every child we
            serve receives individualized care rooted in dignity and love.
          </p>
        </div>
      </section>

      {/* Stories */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-navy-DEFAULT mb-10">Stories of Hope</h2>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-left">
            <Quote className="text-safira-blue mb-4" size={28} />
            <p className="text-slate-700 italic text-base leading-relaxed mb-4">
              "When I arrived at Safira, I didn't believe anyone could help me. Today, I'm in
              school, I have friends, and I know I matter. Safira gave me back my childhood."
            </p>
            <p className="text-safira-blue text-sm font-medium">
              — A survivor, age 14 (name withheld for privacy)
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-safira-blue py-20 px-6 text-center text-white">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Make a Difference Today</h2>
          <p className="text-blue-100 mb-8 text-base">
            Your donation provides food, shelter, education, and hope for survivors.
          </p>
          <a
            href="/donate"
            className="inline-flex items-center gap-2 bg-white text-safira-blue hover:bg-slate-100 font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            <Heart size={18} className="fill-safira-blue" />
            Donate Now
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-DEFAULT text-slate-400 py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-3">
              <Heart className="text-safira-blue fill-safira-blue" size={18} />
              Safira
            </div>
            <p className="text-sm leading-relaxed">Protecting children and restoring hope since 2022.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
              <li><a href="/donate" className="hover:text-white transition-colors">Donate</a></li>
              <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li>contact@safira.org</li>
              <li>+1 (555) 000-0000</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Follow Us</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Instagram</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Facebook</a></li>
              <li><a href="#" className="hover:text-white transition-colors">LinkedIn</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-5xl mx-auto border-t border-slate-700 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>&copy; 2026 Safira. All rights reserved.</p>
          <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
        </div>
      </footer>

    </div>
  )
}

export default App
