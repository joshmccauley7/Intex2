import { useEffect, useState } from 'react';
import '../App.css';
import { ChevronLeft, ChevronRight, Users, Home, Shield, type LucideIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import safiraLogoImg from '../images/safira cropped.png';
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

type HomeLang = 'en' | 'pt' | 'fil';

// ─────────────────────────────────────────────
// FAQ Data
// ─────────────────────────────────────────────
interface FAQItem {
  question: string;
  answer: string;
}

const homepageCopy: Record<HomeLang, {
  heroTitle: string
  heroBody: string
  donateNow: string
  standFor: string
  coreValuesTitle: string
  coreValues: { title: string; desc: string; img: string; imgAlt: string }[]
  nameBehindMission: string
  whySafiraTitle: string
  whySafiraBody: string
  impactStats: { icon: LucideIcon; value: string; label: string }[]
  faqIntro: string
  faqTitle1: string
  faqTitle2: string
  faqItems: FAQItem[]
  faqContactTitle: string
}> = {
  en: {
    heroTitle: 'Every Child Deserves Safety',
    heroBody: 'Safira protects children who are victims of sexual abuse in Brazil, providing shelter, healing, and a path to a brighter future.',
    donateNow: 'Donate Now',
    standFor: 'What we stand for',
    coreValuesTitle: 'Our Core Values',
    coreValues: [
      { title: 'Safety', desc: 'A stable, nurturing home is the first step. Every child who comes to us is safe from harm from day one.', img: valuesSafetyImg, imgAlt: 'Shield with clasped hands - Safety' },
      { title: 'Restoration', desc: 'We walk alongside each child through their healing journey - at their pace, on their terms, with full dignity.', img: valuesRestorationImg, imgAlt: 'Hands holding a growing plant - Restoration' },
      { title: 'Justice', desc: 'We support survivors in pursuing what justice means to them - without pressure, with unwavering advocacy.', img: valuesJusticeImg, imgAlt: 'Scales of justice with laurel wreath - Justice' },
      { title: 'Empowerment', desc: 'Our goal is to help each child move from surviving to thriving - becoming leaders and advocates for themselves.', img: valuesEmpowermentImg, imgAlt: 'Raised fist with rays of light - Empowerment' },
    ],
    nameBehindMission: 'The name behind the mission',
    whySafiraTitle: 'Why we chose Safira',
    whySafiraBody: 'Safira is the Portuguese word for sapphire - a symbol of protection and dignity. Safety and dignity are not privileges, they are fundamental rights. Safira exists as a promise: to safeguard these principles and stand by those we serve.',
    impactStats: [
      { icon: Users, value: '77+', label: 'Children Served' },
      { icon: Home, value: '9', label: 'Safe Homes' },
      { icon: Shield, value: '8', label: 'Years of Impact' },
    ],
    faqIntro: 'Got questions?',
    faqTitle1: 'Frequently asked',
    faqTitle2: 'questions',
    faqItems: [
      { question: 'What is Safira and who do you serve?', answer: 'Safira is a nonprofit organization that provides safe housing, holistic care, and a path toward restoration for girls who have survived sex trafficking, sexual abuse, and online exploitation. We operate in Brazil, inspired by the pioneering work of Lighthouse Sanctuary in the Philippines.' },
      { question: 'How are donations used?', answer: 'Every contribution goes directly toward the care of the children in our shelters - covering shelter, nutritious meals, clothing, education support, counseling, and spiritual development. We publish transparent impact reports so you can see exactly where your money goes.' },
      { question: 'How do I know my donation is making a real difference?', answer: 'Our impact dashboard tracks key outcomes in real time: residents served, safe houses operating, educational milestones reached, and more. Donors with accounts can access their full giving history and see the specific programs their contributions support.' },
      { question: 'Can I volunteer or visit a shelter?', answer: 'Due to the sensitive nature of our work and the privacy of the girls in our care, in-person visits are limited and carefully coordinated. If you are interested in volunteering or partnering with Safira, reach out through our contact form and our team will get back to you.' },
      { question: "How does Safira protect residents' privacy?", answer: 'Protecting the identity and safety of every child in our care is our highest priority. We never publish identifying information about residents, all staff undergo background checks and trauma-informed care training, and our digital systems are secured with role-based access controls and GDPR-compliant data practices.' },
      { question: 'How can my organization or church partner with Safira?', answer: 'We actively welcome partnerships with churches, businesses, schools, and community organizations. Partners can provide financial support, in-kind donations, or awareness campaigns. Contact us to explore how we can work together toward a world where every child is safe.' },
    ],
    faqContactTitle: 'Still have questions? Reach us directly:',
  },
  pt: {
    heroTitle: 'Toda crianca merece seguranca',
    heroBody: 'A Safira protege criancas vitimas de abuso sexual no Brasil, oferecendo abrigo, cura e um caminho para um futuro melhor.',
    donateNow: 'Doar agora',
    standFor: 'No que acreditamos',
    coreValuesTitle: 'Nossos valores',
    coreValues: [
      { title: 'Seguranca', desc: 'Um lar estavel e acolhedor e o primeiro passo. Toda crianca que chega ate nos fica segura desde o primeiro dia.', img: valuesSafetyImg, imgAlt: 'Escudo com maos unidas - Seguranca' },
      { title: 'Restauracao', desc: 'Caminhamos ao lado de cada crianca em sua jornada de cura - no ritmo dela, nos termos dela, com plena dignidade.', img: valuesRestorationImg, imgAlt: 'Maos segurando uma planta - Restauracao' },
      { title: 'Justica', desc: 'Apoiamos sobreviventes na busca pela justica que faz sentido para elas - sem pressao e com defesa constante.', img: valuesJusticeImg, imgAlt: 'Balanca da justica com louros - Justica' },
      { title: 'Empoderamento', desc: 'Nosso objetivo e ajudar cada crianca a sair da sobrevivencia para uma vida plena - tornando-se lider e defensora de si mesma.', img: valuesEmpowermentImg, imgAlt: 'Punho erguido com raios de luz - Empoderamento' },
    ],
    nameBehindMission: 'O nome por tras da missao',
    whySafiraTitle: 'Por que escolhemos Safira',
    whySafiraBody: 'Safira e a palavra em portugues para sapphire - simbolo de protecao e dignidade. Seguranca e dignidade nao sao privilegios: sao direitos fundamentais. Safira existe como uma promessa de proteger esses principios e permanecer ao lado de quem servimos.',
    impactStats: [
      { icon: Users, value: '77+', label: 'Criancas atendidas' },
      { icon: Home, value: '9', label: 'Lares seguros' },
      { icon: Shield, value: '8', label: 'Anos de impacto' },
    ],
    faqIntro: 'Tem duvidas?',
    faqTitle1: 'Perguntas',
    faqTitle2: 'frequentes',
    faqItems: [
      { question: 'O que e a Safira e a quem ela atende?', answer: 'A Safira e uma organizacao sem fins lucrativos que oferece moradia segura, cuidado integral e restauracao para meninas sobreviventes de trafico sexual, abuso sexual e exploracao online.' },
      { question: 'Como as doacoes sao utilizadas?', answer: 'Cada contribuicao vai diretamente para o cuidado das criancas em nossos abrigos: moradia, alimentacao, roupas, apoio educacional, aconselhamento e desenvolvimento espiritual.' },
      { question: 'Como sei que minha doacao gera impacto real?', answer: 'Nosso painel de impacto acompanha indicadores em tempo real, como residentes atendidas, casas seguras em operacao e marcos educacionais alcancados.' },
      { question: 'Posso ser voluntario(a) ou visitar um abrigo?', answer: 'Devido a sensibilidade do trabalho e a privacidade das meninas, visitas presenciais sao limitadas e cuidadosamente coordenadas.' },
      { question: 'Como a Safira protege a privacidade das residentes?', answer: 'Proteger a identidade e a seguranca de cada crianca e nossa prioridade maxima. Nao divulgamos informacoes de identificacao e usamos controles de acesso baseados em papeis.' },
      { question: 'Como minha organizacao ou igreja pode fazer parceria com a Safira?', answer: 'Recebemos parcerias com igrejas, empresas, escolas e organizacoes comunitarias para apoio financeiro, doacoes e campanhas de conscientizacao.' },
    ],
    faqContactTitle: 'Ainda tem perguntas? Fale conosco:',
  },
  fil: {
    heroTitle: 'Bawat bata ay nararapat sa kaligtasan',
    heroBody: 'Pinoprotektahan ng Safira ang mga batang biktima ng pang-aabusong sekswal sa Brazil sa pamamagitan ng tahanan, paggaling, at pag-asa para sa mas magandang kinabukasan.',
    donateNow: 'Mag-donate ngayon',
    standFor: 'Mga pinahahalagahan namin',
    coreValuesTitle: 'Aming pangunahing halaga',
    coreValues: [
      { title: 'Kaligtasan', desc: 'Ang matatag at mapagkalingang tahanan ang unang hakbang. Ligtas ang bawat batang dumarating sa amin mula sa unang araw.', img: valuesSafetyImg, imgAlt: 'Kalasag na may magkahawak na kamay - Kaligtasan' },
      { title: 'Pagpapanumbalik', desc: 'Kasama namin ang bawat bata sa kanilang paghilom - sa sarili nilang bilis, sa paraang may dignidad.', img: valuesRestorationImg, imgAlt: 'Kamay na may hawak na tumutubong halaman - Pagpapanumbalik' },
      { title: 'Katarungan', desc: 'Sinusuportahan namin ang mga survivor sa paghanap ng katarungang nararapat sa kanila - walang pamimilit, may matatag na pagtatanggol.', img: valuesJusticeImg, imgAlt: 'Timbangan ng katarungan - Katarungan' },
      { title: 'Pagpapalakas', desc: 'Layunin naming tulungan ang bawat bata na umunlad mula sa pag-survive tungo sa pag-thrive at pagiging lider para sa sarili.', img: valuesEmpowermentImg, imgAlt: 'Nakataas na kamao - Pagpapalakas' },
    ],
    nameBehindMission: 'Ang pangalang nasa likod ng misyon',
    whySafiraTitle: 'Bakit Safira ang pangalan',
    whySafiraBody: 'Ang Safira ay salitang Portuges para sa sapphire - simbolo ng proteksyon at dignidad. Ang kaligtasan at dignidad ay pangunahing karapatan. Ang Safira ay pangakong pangalagaan ang mga prinsipyong ito at tumindig para sa aming pinaglilingkuran.',
    impactStats: [
      { icon: Users, value: '77+', label: 'Batang natulungan' },
      { icon: Home, value: '9', label: 'Ligtas na tahanan' },
      { icon: Shield, value: '8', label: 'Taon ng epekto' },
    ],
    faqIntro: 'May tanong ka?',
    faqTitle1: 'Mga madalas',
    faqTitle2: 'itanong',
    faqItems: [
      { question: 'Ano ang Safira at sino ang inyong pinaglilingkuran?', answer: 'Ang Safira ay nonprofit na nagbibigay ng ligtas na tirahan, holistic na pag-aalaga, at daan sa pagpapanumbalik para sa mga batang nakaligtas sa trafficking at pang-aabuso.' },
      { question: 'Paano ginagamit ang mga donasyon?', answer: 'Direktang napupunta ang bawat donasyon sa pangangalaga ng mga bata sa aming mga tahanan - tirahan, pagkain, damit, edukasyon, counseling, at espiritwal na paghubog.' },
      { question: 'Paano ko malalaman na may tunay na epekto ang donasyon ko?', answer: 'Sinusubaybayan ng impact dashboard ang mahahalagang resulta sa real time, kabilang ang dami ng residenteng natulungan at mga bahay na ligtas na tumatakbo.' },
      { question: 'Pwede ba akong mag-volunteer o bumisita sa shelter?', answer: 'Dahil sensitibo ang aming trabaho at mahalaga ang privacy ng mga bata, limitado at maingat ang pagkoordina ng personal na pagbisita.' },
      { question: 'Paano pinoprotektahan ng Safira ang privacy ng residents?', answer: 'Pinakamataas naming prayoridad ang seguridad at pagkakakilanlan ng bawat bata. May role-based access controls at mahigpit na data protection practices kami.' },
      { question: 'Paano makikipag-partner ang aming organisasyon o simbahan sa Safira?', answer: 'Malugod naming tinatanggap ang pakikipagtulungan mula sa simbahan, negosyo, paaralan, at komunidad sa pinansyal na suporta, in-kind donations, at awareness campaigns.' },
    ],
    faqContactTitle: 'May iba ka pang tanong? Makipag-ugnayan sa amin:',
  },
};

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

function FAQAccordion({ copy }: { copy: (typeof homepageCopy)['en'] }) {
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
            {copy.faqIntro}
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
            {copy.faqTitle1}
            <br />
            <em>{copy.faqTitle2}</em>
          </h2>
        </div>

        <div style={{ borderTop: '1px solid #c9c2b4' }}>
          {copy.faqItems.map((faq, i) => (
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
          <p style={{ margin: 0, fontWeight: 600, color: '#1a1a18' }}>{copy.faqContactTitle}</p>
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
  const location = useLocation();
  const [currentImg, setCurrentImg] = useState(0);
  const [imagesReady, setImagesReady] = useState(heroImages.length === 0);
  const [lang, setLang] = useState<HomeLang>('en');

  useEffect(() => {
    const urlLang = new URLSearchParams(location.search).get('lang');
    const stored = localStorage.getItem('homeLanguage');
    const resolved = (urlLang === 'pt' || urlLang === 'fil' || urlLang === 'en')
      ? urlLang
      : (stored === 'pt' || stored === 'fil' || stored === 'en' ? stored : 'en');
    setLang(resolved);
    localStorage.setItem('homeLanguage', resolved);
  }, [location.search]);

  const copy = homepageCopy[lang];

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

      <SiteNav homeLang={lang} />

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
            className="w-full md:w-[480px] md:max-w-[55%] rounded-lg px-5 sm:px-6 md:px-8 py-4 hero-animate bg-white/75 dark:bg-slate-900/80"
            style={{
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.14)',
            }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-2 text-[#0f172a] dark:text-slate-100 hero-animate">
              {copy.heroTitle}
            </h1>
            <p className="text-slate-700 dark:text-slate-200 mb-4 leading-relaxed text-sm sm:text-base hero-animate-delay">
              {copy.heroBody}
            </p>
            <div className="hero-animate-delay-2">
              <a
                href="/donate"
                className="inline-flex items-center bg-safira-blue hover:bg-safira-blue-dark text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm shadow"
              >
                {copy.donateNow}
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
              aria-label={lang === 'pt' ? 'Imagem anterior' : lang === 'fil' ? 'Nakaraang larawan' : 'Previous image'}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => goTo(currentImg + 1)}
              className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-white/30 hover:bg-white/60 text-white rounded-full p-1.5 transition-colors backdrop-blur-sm"
              aria-label={lang === 'pt' ? 'Proxima imagem' : lang === 'fil' ? 'Susunod na larawan' : 'Next image'}
            >
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {heroImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={
                    lang === 'pt'
                      ? `Ir para imagem ${i + 1}`
                      : lang === 'fil'
                      ? `Pumunta sa larawan ${i + 1}`
                      : `Go to image ${i + 1}`
                  }
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
      <section className="px-6 pt-20 pb-16 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold tracking-widest uppercase text-safira-blue mb-3">{copy.standFor}</p>
            <h2 className="text-4xl font-bold text-[#0f172a] dark:text-white">{copy.coreValuesTitle}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {copy.coreValues.map(({ title, desc, img, imgAlt }) => (
              <div key={title} className="bg-white dark:bg-slate-800 rounded-2xl p-9 text-center border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="mx-auto mb-6 flex items-center justify-center" style={{ width: 132, height: 132 }}>
                  <img src={img} alt={imgAlt} style={{ width: 132, height: 132, objectFit: 'contain', borderRadius: '0.75rem' }} />
                </div>
                <h3 className="font-bold text-2xl text-[#0f172a] dark:text-white mb-3">{title}</h3>
                <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">{desc}</p>
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
                {copy.nameBehindMission}
              </p>
              <h2
                className="text-4xl md:text-5xl font-bold text-white mb-6"
                style={{ lineHeight: '1.15' }}
              >
                <span style={{ color: '#93c5fd', fontStyle: 'italic' }}>{copy.whySafiraTitle}</span>
              </h2>
              <p
                className="text-blue-100"
                style={{ fontSize: '1.25rem', lineHeight: '1.75' }}
              >
                {copy.whySafiraBody}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Impact stats (intersecting row) ── */}
      <div className="relative z-10 -mt-24 mb-14 w-full max-w-5xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-5 lg:gap-6">
          {copy.impactStats.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="group relative flex flex-col items-center rounded-2xl border border-slate-200/90 bg-white px-6 pb-9 pt-10 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-4px_rgba(15,23,42,0.1)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.14)]"
            >
              <div
                className="mb-5 flex h-[3.5rem] w-[3.5rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-blue-50 to-blue-100/60 text-safira-blue shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-blue-200/50"
                aria-hidden
              >
                <Icon size={30} strokeWidth={1.65} className="opacity-95" />
              </div>
              <p className="min-h-[3rem] text-[2.625rem] font-bold leading-none tracking-tight text-navy dark:text-slate-100 tabular-nums sm:text-5xl sm:min-h-[3.25rem]">
                {value}
              </p>
              <p className="mt-3 max-w-[11rem] text-[0.9375rem] font-medium leading-snug text-slate-600 dark:text-slate-300">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── About Tabs ── */}
      <SafiraTabbedContent homeLang={lang} />

      {/* ── FAQ ── */}
      <div style={{ background: '#f7f3ec' }}>
        <FAQAccordion copy={copy} />
      </div>

      <SiteFooter homeLang={lang} />
    </div>
  );
}
