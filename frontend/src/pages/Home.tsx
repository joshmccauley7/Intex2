import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../App.css';
import { Heart, Users, Home, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiFetch } from '../api';
import SiteFooter from '../components/layout/SiteFooter';
import ThemeToggle from '../components/theme/ThemeToggle';

// Dynamically import all images from the homepage folder
const imageModules = import.meta.glob('../images/homepage/*.{jpg,jpeg,png,webp}', {
  eager: true,
}) as Record<string, { default: string }>;

const heroImages = Object.values(imageModules).map((m) => m.default);

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
  const [currentImg, setCurrentImg] = useState(0);
  const [fading, setFading] = useState(false);
  const [imagesReady, setImagesReady] = useState(heroImages.length === 0);

  useEffect(() => {
    apiFetch('/api/impact/summary')
      .then(setImpact)
      .catch(() => null);
  }, []);

  // Preload all carousel images before showing anything
  useEffect(() => {
    if (heroImages.length === 0) return;
    let loaded = 0;
    heroImages.forEach((src) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded += 1;
        if (loaded === heroImages.length) setImagesReady(true);
      };
      img.src = src;
    });
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (heroImages.length <= 1) return;
      setFading(true);
      setTimeout(() => {
        setCurrentImg((index + heroImages.length) % heroImages.length);
        setFading(false);
      }, 350);
    },
    []
  );

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const timer = setInterval(() => {
      goTo(currentImg + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, [currentImg, goTo]);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Navbar */}
      <nav className="bg-[#0f172a] dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-slate-800/80">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Heart className="text-safira-blue fill-safira-blue" size={22} />
          Safira
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <Link to="/" className="text-white hover:text-blue-400 transition-colors">
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

      {/* Hero Carousel */}
      <section className="relative overflow-hidden" style={{ height: '560px' }}>
        {/* Background image — hidden until all images are preloaded */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{
            backgroundImage: `url(${heroImages[currentImg]})`,
            backgroundPosition: 'center 20%',
            opacity: !imagesReady || fading ? 0 : 1,
          }}
        />
        {/* Very subtle darkening only at edges, keeping center bright */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0.18) 100%)' }} />

        {/* Text card — left side */}
        <div className="relative z-10 h-full flex items-center px-10 md:px-16">
          <div
            className="max-w-sm w-full rounded-2xl px-8 py-9 hero-animate"
            style={{
              background: 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            }}
          >
            <h1 className="text-3xl font-bold leading-tight mb-3 text-[#0f172a] hero-animate">
              Every Child Deserves Safety
            </h1>
            <p className="text-slate-600 mb-6 leading-relaxed text-sm hero-animate-delay">
              Safira protects children who are victims of sexual abuse in Brazil, providing
              shelter, healing, and a path to a brighter future.
            </p>
            <div className="hero-animate-delay-2">
              <a
                href="/donate"
                className="inline-flex items-center gap-2 bg-safira-blue hover:bg-safira-blue-dark text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm shadow"
              >
                <Heart size={16} className="fill-white" />
                Donate Now
              </a>
            </div>
          </div>
        </div>

        {/* Prev / Next arrows */}
        {heroImages.length > 1 && (
          <>
            <button
              onClick={() => goTo(currentImg - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-white/70 hover:bg-white text-slate-800 rounded-full p-2 shadow transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={() => goTo(currentImg + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-white/70 hover:bg-white text-slate-800 rounded-full p-2 shadow transition-colors"
              aria-label="Next image"
            >
              <ChevronRight size={22} />
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {heroImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === currentImg ? 'bg-white' : 'bg-white/50'
                  }`}
                  aria-label={`Go to image ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
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
            Safira exists to rescue, shelter, and rehabilitate children who have suffered
            sexual abuse in Brazil. We provide safe housing, trauma-informed care, educational
            support, and legal advocacy — empowering survivors to heal and reclaim their futures.
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
