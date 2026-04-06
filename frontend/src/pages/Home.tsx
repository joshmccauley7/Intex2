import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../App.css';
import { Heart, Users, Home, Shield } from 'lucide-react';
import { apiFetch } from '../api';
import heroImg from '../images/home.jpg';
import SiteFooter from '../components/layout/SiteFooter';
import ThemeToggle from '../components/theme/ThemeToggle';

interface ImpactSummary {
  latestSnapshot: {
    snapshotId: number;
    snapshotDate: string;
    summaryText: string;
  } | null;
  activeSafehouses: number;
  totalResidents: number;
}

export default function HomePage() {
  const [impact, setImpact] = useState<ImpactSummary | null>(null);

  useEffect(() => {
    apiFetch('/api/impact/summary')
      .then(setImpact)
      .catch(() => null);
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Navbar */}
      <nav className="bg-[#0f172a] dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-slate-800/80">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Heart className="text-safira-blue fill-safira-blue" size={22} />
          Safira
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <Link
            to="/"
            className="text-white hover:text-blue-400 transition-colors"
          >
            Home
          </Link>
          <a href="/about" className="hover:text-white transition-colors">
            About
          </a>
          <Link to="/impact" className="hover:text-white transition-colors">
            Impact
          </Link>
          <a href="/donate" className="hover:text-white transition-colors">
            Donate
          </a>
          <a href="/contact" className="hover:text-white transition-colors">
            Contact
          </a>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a
            href="/donate"
            className="flex items-center gap-2 bg-safira-blue hover:bg-safira-blue-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Heart size={16} className="fill-white" />
            <span className="hidden sm:inline">Donate Now</span>
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative text-white text-center py-28 px-6 bg-cover bg-center"
        style={{
          backgroundImage: `url(${heroImg})`,
          backgroundPosition: 'center 15%',
        }}
      >
        <div className="absolute inset-0 bg-[#0f172a]/70" />
        <div
          className="relative z-10 max-w-2xl mx-auto px-8 py-10 rounded-2xl hero-animate"
          style={{
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          <h1
            className="text-5xl font-bold leading-tight mb-4 text-white hero-animate"
            style={{ textShadow: '0 2px 16px rgba(0,0,0,0.7)' }}
          >
            Every Child Deserves Safety
          </h1>
          <p
            className="text-lg text-white/95 mb-8 leading-relaxed hero-animate-delay"
            style={{ textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}
          >
            Safira protects children who are victims of sexual abuse in Brazil,
            providing shelter, healing, and a path to a brighter future.
          </p>
          <div className="hero-animate-delay-2">
            <a
              href="/donate"
              className="inline-flex items-center gap-2 bg-safira-blue hover:bg-safira-blue-dark text-white font-semibold px-8 py-3 rounded-lg transition-colors text-base shadow-lg"
            >
              <Heart size={18} className="fill-white" />
              Donate Now
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white dark:bg-slate-900 py-12 px-6 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-8 text-center border border-slate-100 dark:border-slate-700">
            <Users className="mx-auto mb-3 text-safira-blue" size={28} />
            <div className="text-4xl font-bold text-navy-DEFAULT dark:text-slate-100 mb-1">
              {impact ? `${impact.totalResidents}+` : '—'}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Children Served
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-8 text-center border border-slate-100 dark:border-slate-700">
            <Home className="mx-auto mb-3 text-safira-blue" size={28} />
            <div className="text-4xl font-bold text-navy-DEFAULT dark:text-slate-100 mb-1">
              {impact ? impact.activeSafehouses : '—'}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Safe Homes
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-8 text-center border border-slate-100 dark:border-slate-700">
            <Shield className="mx-auto mb-3 text-safira-blue" size={28} />
            <div className="text-4xl font-bold text-navy-DEFAULT dark:text-slate-100 mb-1">
              8
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Years of Impact
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-slate-50 dark:bg-slate-900/50 py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-navy-DEFAULT dark:text-slate-100 mb-4">
            Our Mission
          </h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Safira exists to rescue, shelter, and rehabilitate children who have
            suffered sexual abuse in Brazil. We provide safe housing,
            trauma-informed care, educational support, and legal advocacy —
            empowering survivors to heal and reclaim their futures.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white dark:bg-slate-950 py-16 px-6 text-center border-t border-slate-100 dark:border-slate-800">
        <h2 className="text-3xl font-bold text-navy-DEFAULT dark:text-slate-100 mb-4">
          See the Impact Your Support Makes
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
          View real data on outcomes, donations, and safe home progress.
        </p>
        <Link
          to="/impact"
          className="inline-block bg-safira-blue hover:bg-safira-blue-dark text-white font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          View Impact Dashboard
        </Link>
      </section>

      <SiteFooter variant="dark" />
    </div>
  );
}
