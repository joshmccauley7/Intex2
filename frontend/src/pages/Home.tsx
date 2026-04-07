import { useEffect, useState } from 'react';
import '../App.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import safiraLogoImg from '../images/safira cropped.png';
import faviconImg from '/favicon.ico';
import valuesSafetyImg from '../images/values/safety.jpg';
import valuesRestorationImg from '../images/values/restoration.jpg';
import valuesJusticeImg from '../images/values/justice.png';
import valuesEmpowermentImg from '../images/values/empowerment.jpg';
import SiteFooter from '../components/layout/SiteFooter';
import SiteNav from '../components/layout/SiteNav';
import SafiraTabbedContent from '../components/SafiraTabbedContent';

// Dynamically import all images from the homepage folder
const imageModules = import.meta.glob(
  '../images/homepage/*.{jpg,jpeg,png,webp}',
  { eager: true }
) as Record<string, { default: string }>;

const heroImages = Object.values(imageModules).map((m) => m.default);

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
    <div style={{ borderBottom: '1px solid #c9c2b4', overflow: 'hidden' }}>
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
              color: '#6b6656',
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

        <div style={{ borderTop: '1px solid #c9c2b4' }}>
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

        <div
          style={{
            marginTop: '2rem',
            fontSize: '0.875rem',
            color: '#5f5d53',
            fontFamily: "'DM Sans', sans-serif",
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, color: '#1a1a18' }}>Still have questions? Reach us directly:</p>
          <p style={{ margin: 0 }}>📞 555-555-5555</p>
          <p style={{ margin: 0 }}>✉️ safira@email.com</p>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// Home Page
// ─────────────────────────────────────────────
export default function HomePage() {
  const [currentImg, setCurrentImg] = useState(0);
  const [imagesReady, setImagesReady] = useState(heroImages.length === 0);

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

      <SiteNav />

      {/* ── Hero Carousel ── */}
      <section className="relative overflow-hidden h-[420px] md:h-[560px]">
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
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0.18) 100%)',
          }}
        />

        {/* Text card */}
        <div className="relative z-10 h-full flex items-center px-4 sm:px-6 md:px-16">
          <div
            className="w-full md:w-[480px] md:max-w-[55%] rounded-lg px-5 sm:px-6 md:px-8 py-4 hero-animate"
            style={{
              background: 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.14)',
            }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-2 text-[#0f172a] hero-animate">
              Every Child Deserves Safety
            </h1>
            <p className="text-slate-600 mb-4 leading-relaxed text-sm sm:text-base hero-animate-delay">
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
              className="hidden md:block absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-white/30 hover:bg-white/60 text-white rounded-full p-1.5 transition-colors backdrop-blur-sm"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => goTo(currentImg + 1)}
              className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-white/30 hover:bg-white/60 text-white rounded-full p-1.5 transition-colors backdrop-blur-sm"
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
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

      {/* ── Core Values ── */}
      <section className="px-6 pt-20 pb-16" style={{ background: '#ffffff' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold tracking-widest uppercase text-safira-blue mb-3">What we stand for</p>
            <h2 className="text-4xl font-bold text-[#0f172a] dark:text-white">Our Core Values</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { title: 'Safety', desc: 'A stable, nurturing home is the first step. Every child who comes to us is safe from harm from day one.', img: valuesSafetyImg, imgAlt: 'Shield with clasped hands — Safety' },
              { title: 'Restoration', desc: 'We walk alongside each child through their healing journey — at their pace, on their terms, with full dignity.', img: valuesRestorationImg, imgAlt: 'Hands holding a growing plant — Restoration' },
              { title: 'Justice', desc: 'We support survivors in pursuing what justice means to them — without pressure, with unwavering advocacy.', img: valuesJusticeImg, imgAlt: 'Scales of justice with laurel wreath — Justice' },
              { title: 'Empowerment', desc: 'Our goal is to help each child move from surviving to thriving — becoming leaders and advocates for themselves.', img: valuesEmpowermentImg, imgAlt: 'Raised fist with rays of light — Empowerment' },
            ].map(({ title, desc, img, imgAlt }) => (
              <div key={title} className="bg-white dark:bg-slate-800 rounded-2xl p-9 text-center border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="mx-auto mb-6 flex items-center justify-center" style={{ width: 132, height: 132 }}>
                  <img src={img} alt={imgAlt} style={{ width: 132, height: 132, objectFit: 'contain', borderRadius: '0.75rem' }} />
                </div>
                <h3 className="font-bold text-2xl text-[#0f172a] dark:text-white mb-3">{title}</h3>
                <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Safira ── */}
      <section
        className="relative px-2 pt-16 pb-40"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0e2a5c 55%, #2563eb 100%)' }}
      >
        <div className="max-w-6xl mx-auto">
          <div
            className="flex flex-col md:flex-row items-center gap-12"
          >
            {/* Image — left column */}
            <div className="w-full md:w-1/2 flex-shrink-0 flex justify-center">
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  boxShadow: '0 12px 48px rgba(0,0,0,0.45)',
                  border: '2px solid rgba(255,255,255,0.12)',
                  maxWidth: '620px',
                  width: '100%',
                }}
              >
                <img
                  src={safiraLogoImg}
                  alt="Safira — the sapphire that stands for protection"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            </div>

            {/* Text — right column */}
            <div className="w-full md:w-1/2">
              <p className="text-xs font-semibold tracking-widest uppercase text-blue-300 mb-3">
                The name behind the mission
              </p>
              <h2
                className="text-4xl md:text-5xl font-bold text-white mb-6"
                style={{ lineHeight: '1.15' }}
              >
                Why we chose{' '}
                <span style={{ color: '#93c5fd', fontStyle: 'italic' }}>Safira</span>
              </h2>
              <p
                className="text-blue-100"
                style={{ fontSize: '1.25rem', lineHeight: '1.75' }}
              >
                <em>Safira</em> is the Portuguese word for <strong style={{ color: '#fff' }}>sapphire</strong> — a symbol of protection and dignity. Every child who walks through our doors carries that same inherent worth. <strong style={{ color: '#fff' }}>Safira is our promise</strong> to guard and reflect that truth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Founder Quote (intersecting card) ── */}
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,600&display=swap" rel="stylesheet" />
      <div className="relative z-10" style={{ marginTop: '-6rem', marginBottom: '3rem', padding: '0 12.5%' }}>
        <div
          className="rounded-2xl px-14 py-8 text-center"
          style={{ background: '#ffffff', boxShadow: '0 8px 40px rgba(15, 23, 42, 0.18)' }}
        >
          <span style={{ fontSize: '3.5rem', lineHeight: 1, color: '#2563eb', fontFamily: 'Georgia, serif', display: 'block', marginBottom: '0.25rem' }}>&ldquo;</span>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontStyle: 'italic', fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)', lineHeight: '1.8', color: '#1e293b', margin: '0 0 1.5rem' }}>
            Every child deserves to feel safe, valued, and full of possibility.
            That is not a dream — it is a right we fight for every single day.
          </p>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: '#2563eb', letterSpacing: '0.05em' }}>— Safira Founders</p>
        </div>
      </div>

      {/* ── About Tabs ── */}
      <SafiraTabbedContent />

      {/* ── FAQ ── */}
      <div style={{ background: '#f7f3ec' }}>
        <FAQAccordion />
      </div>

      <SiteFooter />
    </div>
  );
}
