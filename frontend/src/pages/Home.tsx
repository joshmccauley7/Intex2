import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../App.css';
import { Users, Home, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import faviconImg from '/favicon.ico';
import { apiFetch } from '../api';
import SiteFooter from '../components/layout/SiteFooter';
import ThemeToggle from '../components/theme/ThemeToggle';
import SafiraTabbedContent from '../components/SafiraTabbedContent';

// Dynamically import all images from the homepage folder
const imageModules = import.meta.glob('../images/homepage/*.{jpg,jpeg,png,webp}', {
  eager: true,
}) as Record<string, { default: string }>;

const heroImages = Object.values(imageModules).map((m) => m.default);

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface ImpactSummary {
  latestSnapshot: {
    snapshotId: number;
    snapshotDate: string;
    summaryText: string;
  } | null;
  activeSafehouses: number;
  totalResidents: number;
}

// ─────────────────────────────────────────────
// FAQ Data
// ─────────────────────────────────────────────
interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'What is Safira and who do you serve?',
    answer:
      'Safira is a nonprofit organization that provides safe housing, holistic care, and a path toward restoration for girls who have survived sex trafficking, sexual abuse, and online exploitation. We operate in Brazil, inspired by the pioneering work of Lighthouse Sanctuary in the Philippines.',
  },
  {
    question: 'How are donations used?',
    answer:
      'Every contribution goes directly toward the care of the children in our shelters — covering shelter, nutritious meals, clothing, education support, counseling, and spiritual development. We publish transparent impact reports so you can see exactly where your money goes.',
  },
  {
    question: 'How do I know my donation is making a real difference?',
    answer:
      'Our impact dashboard tracks key outcomes in real time: residents served, safe houses operating, educational milestones reached, and more. Donors with accounts can access their full giving history and see the specific programs their contributions support.',
  },
  {
    question: 'Can I volunteer or visit a shelter?',
    answer:
      'Due to the sensitive nature of our work and the privacy of the girls in our care, in-person visits are limited and carefully coordinated. If you are interested in volunteering or partnering with Safira, reach out through our contact form and our team will get back to you.',
  },
  {
    question: "How does Safira protect residents' privacy?",
    answer:
      'Protecting the identity and safety of every child in our care is our highest priority. We never publish identifying information about residents, all staff undergo background checks and trauma-informed care training, and our digital systems are secured with role-based access controls and GDPR-compliant data practices.',
  },
  {
    question: 'How can my organization or church partner with Safira?',
    answer:
      'We actively welcome partnerships with churches, businesses, schools, and community organizations. Partners can provide financial support, in-kind donations, or awareness campaigns. Contact us to explore how we can work together toward a world where every child is safe.',
  },
];

// ─────────────────────────────────────────────
// FAQ Accordion
// ─────────────────────────────────────────────
interface AccordionItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

function AccordionItem({ question, answer, isOpen, onToggle }: AccordionItemProps) {
  return (
    <div style={{ borderBottom: '1px solid #e5e2db', overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '1.25rem 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '1rem',
          fontWeight: isOpen ? '600' : '400',
          color: isOpen ? '#1a1a18' : '#3d3d38',
          transition: 'color 0.2s',
        }}
      >
        <span>{question}</span>
        <span
          style={{
            flexShrink: 0,
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            border: `1.5px solid ${isOpen ? '#1a1a18' : '#b0ad9e'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'border-color 0.2s, transform 0.3s',
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            position: 'relative',
          }}
        >
          <span
            style={{
              position: 'absolute',
              width: '10px',
              height: '1.5px',
              background: isOpen ? '#1a1a18' : '#b0ad9e',
              transition: 'background 0.2s',
            }}
          />
          <span
            style={{
              position: 'absolute',
              width: '1.5px',
              height: '10px',
              background: isOpen ? '#1a1a18' : '#b0ad9e',
              transition: 'background 0.2s',
            }}
          />
        </span>
      </button>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.3s ease',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <p
            style={{
              padding: '0 2rem 1.25rem 0',
              margin: 0,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.9375rem',
              lineHeight: '1.75',
              color: '#6b6b63',
            }}
          >
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;600&display=swap"
        rel="stylesheet"
      />
      <div
        style={{
          maxWidth: '680px',
          margin: '0 auto',
          padding: '3rem 1.5rem',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{ marginBottom: '2.5rem' }}>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#b0ad9e',
              marginBottom: '0.5rem',
            }}
          >
            Got questions?
          </p>
          <h2
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: '400',
              color: '#1a1a18',
              lineHeight: '1.2',
              margin: 0,
            }}
          >
            Frequently asked
            <br />
            <em>questions</em>
          </h2>
        </div>

        <div style={{ borderTop: '1px solid #e5e2db' }}>
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === i}
              onToggle={() => toggle(i)}
            />
          ))}
        </div>

        <p
          style={{
            marginTop: '2rem',
            fontSize: '0.875rem',
            color: '#9a9990',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Still have questions?{' '}
          <a
            href="#contact"
            style={{
              color: '#1a1a18',
              textDecoration: 'underline',
              textDecorationColor: '#b0ad9e',
              textUnderlineOffset: '3px',
            }}
          >
            Get in touch
          </a>
          .
        </p>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// Home Page
// ─────────────────────────────────────────────
export default function HomePage() {
  const [impact, setImpact] = useState<ImpactSummary | null>(null);
  const [currentImg, setCurrentImg] = useState(0);
  const [imagesReady, setImagesReady] = useState(heroImages.length === 0);

  useEffect(() => {
    apiFetch('/api/impact/summary')
      .then(setImpact)
      .catch(() => null);
  }, []);

  // Preload all carousel images before revealing the hero
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

  const goTo = (index: number) => {
    setCurrentImg((index + heroImages.length) % heroImages.length);
  };

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentImg((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">

      {/* ── Navbar ── */}
      <nav className="bg-[#0f172a] dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-slate-800/80">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <img src={faviconImg} alt="Safira logo" style={{ width: 22, height: 22 }} />
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
            <img src={faviconImg} alt="" style={{ width: 16, height: 16 }} />
            <span className="hidden sm:inline">Donate Now</span>
          </a>
        </div>
      </nav>

      {/* ── Hero Carousel ── */}
      <section className="relative overflow-hidden" style={{ height: '560px' }}>
        {heroImages.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms]"
            style={{
              backgroundImage: `url(${src})`,
              backgroundPosition: 'center 20%',
              opacity: imagesReady && i === currentImg ? 1 : 0,
            }}
          />
        ))}
        {/* Edge darkening */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0.18) 100%)',
          }}
        />

        {/* Text card — left side */}
        <div className="relative z-10 h-full flex items-center px-10 md:px-16">
          <div
            className="w-[480px] max-w-[55%] rounded-lg px-8 py-4 hero-animate"
            style={{
              background: 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.14)',
            }}
          >
            <h1 className="text-3xl font-bold leading-tight mb-2 text-[#0f172a] hero-animate">
              Every Child Deserves Safety
            </h1>
            <p className="text-slate-600 mb-4 leading-relaxed text-sm hero-animate-delay">
              Safira protects children who are victims of sexual abuse in Brazil, providing
              shelter, healing, and a path to a brighter future.
            </p>
            <div className="hero-animate-delay-2">
              <a
                href="/donate"
                className="inline-flex items-center gap-2 bg-safira-blue hover:bg-safira-blue-dark text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm shadow"
              >
                <img src={faviconImg} alt="" style={{ width: 16, height: 16 }} />
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
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-white/30 hover:bg-white/60 text-white rounded-full p-1.5 transition-colors backdrop-blur-sm"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => goTo(currentImg + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-white/30 hover:bg-white/60 text-white rounded-full p-1.5 transition-colors backdrop-blur-sm"
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
            {/* Dot indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {heroImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to image ${i + 1}`}
                  className="rounded-full transition-all"
                  style={{
                    width: i === currentImg ? '20px' : '8px',
                    height: '8px',
                    background: i === currentImg ? 'white' : 'rgba(255,255,255,0.5)',
                  }}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Stats ── */}
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
              100%
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Mission-Focused
            </div>
          </div>
        </div>
      </section>

      {/* ── About / Tabbed Content ── */}
      <section className="bg-slate-50 dark:bg-slate-900 py-4 px-6">
        <SafiraTabbedContent />
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white dark:bg-slate-900 py-4 px-6 border-t border-slate-100 dark:border-slate-800">
        <FAQAccordion />
      </section>

      {/* ── Footer ── */}
      <SiteFooter />
    </div>
  );
}
