import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import aboutImg from "../images/tabs/About.webp";
import missionImg from "../images/tabs/Mission.jpg";
import platformImg from "../images/tabs/Platform.png";
import donateImg from "../images/tabs/Donate.jpg";

type HomeLang = "en" | "pt" | "fil";

const sectionByLang: Record<HomeLang, {
  label: string
  image: string
  imageAlt: string
  accent: string
  heading: string
  body: string
  cta?: { text: string; href: string }
  linkHref?: string
  linkLabel?: string
  adminOnly?: boolean
}[]> = {
  en: [
  {
    label: "About",
    image: aboutImg,
    imageAlt: "Safira safe house exterior",
    accent: "#2563eb",
    heading: "We are Safira.",
    body: "Safira is a nonprofit organization dedicated to providing safe housing, holistic care, and lasting restoration to girls who have survived sex trafficking and abuse. Inspired by the pioneering work of Lighthouse Sanctuary in the Philippines, we are bringing that same model of healing — rooted in hope, dignity, and community — to a new region of the world.",
    linkHref: "/impact",
    linkLabel: "See our impact",
  },
  {
    label: "Mission",
    image: missionImg,
    imageAlt: "Girls learning together",
    accent: "#7c3aed",
    heading: "Protecting children. Restoring hope.",
    body: "Our mission is to serve girl survivors with everything they need to thrive: safe shelter, nutritious food, access to education, and a community of people who see, hear, and love them. We are guided by a simple belief — every child deserves to feel safe, valued, and full of possibility.",
    linkHref: "/impact",
    linkLabel: "See our impact",
  },
  {
    label: "Platform",
    image: platformImg,
    imageAlt: "Safira admin dashboard",
    accent: "#059669",
    heading: "Technology built for impact.",
    body: "We built a secure, centralized case management platform so our staff can spend less time fighting spreadsheets and more time with the girls they serve. The system tracks resident progress, manages donor relationships, and surfaces real-time impact metrics — all protected behind role-based authentication.",
    adminOnly: true,
    linkHref: "/admin/dashboard",
    linkLabel: "Go to admin dashboard",
  },
  {
    label: "Donate",
    image: donateImg,
    imageAlt: "A child reading in the shelter",
    accent: "#dc2626",
    heading: "Your gift changes a life.",
    body: "Every donation to Safira goes directly toward shelter, meals, education, and care for the girls we serve. We believe donors deserve full transparency — that's why our platform gives you access to your giving history, real impact data, and the stories behind the numbers.",
    cta: { text: "Donate Now", href: "/donate" },
  },
  ],
  pt: [
    {
      label: "Sobre",
      image: aboutImg,
      imageAlt: "Fachada da casa segura da Safira",
      accent: "#2563eb",
      heading: "Somos a Safira.",
      body: "A Safira e uma organizacao sem fins lucrativos dedicada a oferecer moradia segura, cuidado integral e restauracao duradoura para meninas sobreviventes de trafico e abuso.",
      linkHref: "/impact",
      linkLabel: "Ver nosso impacto",
    },
    {
      label: "Missao",
      image: missionImg,
      imageAlt: "Meninas estudando juntas",
      accent: "#7c3aed",
      heading: "Protegendo criancas. Restaurando esperanca.",
      body: "Nossa missao e servir meninas sobreviventes com tudo o que precisam para prosperar: abrigo seguro, alimentacao, acesso a educacao e uma comunidade que as ve, escuta e ama.",
      linkHref: "/impact",
      linkLabel: "Ver nosso impacto",
    },
    {
      label: "Plataforma",
      image: platformImg,
      imageAlt: "Painel administrativo da Safira",
      accent: "#059669",
      heading: "Tecnologia para gerar impacto.",
      body: "Criamos uma plataforma segura e centralizada para que nossa equipe gaste menos tempo com planilhas e mais tempo com as meninas que atende.",
      adminOnly: true,
      linkHref: "/admin/dashboard",
      linkLabel: "Ir ao painel",
    },
    {
      label: "Doar",
      image: donateImg,
      imageAlt: "Uma crianca lendo no abrigo",
      accent: "#dc2626",
      heading: "Sua doacao muda uma vida.",
      body: "Cada doacao para a Safira vai diretamente para abrigo, alimentacao, educacao e cuidado das meninas atendidas.",
      cta: { text: "Doar agora", href: "/donate" },
    },
  ],
  fil: [
    {
      label: "Tungkol",
      image: aboutImg,
      imageAlt: "Labas ng ligtas na tahanan ng Safira",
      accent: "#2563eb",
      heading: "Kami ang Safira.",
      body: "Ang Safira ay nonprofit na nakatuon sa ligtas na tirahan, holistic na pag-aalaga, at pangmatagalang pagpapanumbalik para sa mga batang nakaligtas sa trafficking at abuso.",
      linkHref: "/impact",
      linkLabel: "Tingnan ang epekto",
    },
    {
      label: "Misyon",
      image: missionImg,
      imageAlt: "Mga batang sabay na natututo",
      accent: "#7c3aed",
      heading: "Pagprotekta sa mga bata. Pagpapanumbalik ng pag-asa.",
      body: "Misyon naming tulungan ang mga survivor gamit ang mga kailangan nila para umunlad: ligtas na tahanan, masustansyang pagkain, edukasyon, at komunidad na tunay na nagmamalasakit.",
      linkHref: "/impact",
      linkLabel: "Tingnan ang epekto",
    },
    {
      label: "Plataporma",
      image: platformImg,
      imageAlt: "Safira admin dashboard",
      accent: "#059669",
      heading: "Teknolohiyang ginawa para sa epekto.",
      body: "Gumawa kami ng secure at centralized na platform para mas kaunting oras sa spreadsheets at mas maraming oras sa mga batang pinaglilingkuran.",
      adminOnly: true,
      linkHref: "/admin/dashboard",
      linkLabel: "Pumunta sa dashboard",
    },
    {
      label: "Mag-donate",
      image: donateImg,
      imageAlt: "Batang nagbabasa sa shelter",
      accent: "#dc2626",
      heading: "Ang iyong tulong ay nagbabago ng buhay.",
      body: "Bawat donasyon sa Safira ay direktang napupunta sa tirahan, pagkain, edukasyon, at pangangalaga para sa mga batang aming sinusuportahan.",
      cta: { text: "Mag-donate ngayon", href: "/donate" },
    },
  ],
};

function SectionCard({
  label,
  image,
  imageAlt,
  accent,
  heading,
  body,
  cta,
  linkHref,
  linkLabel,
}: (typeof sectionByLang)["en"][0]) {
  // `revealed` drives both the hover visual and the navigation guard.
  // Desktop: mouse enter → revealed. Mobile: first tap → revealed, second tap → navigate.
  const [revealed, setRevealed] = useState(false);
  const navigate = useNavigate();

  const isClickable = !!linkHref;

  const handleClick = () => {
    if (!isClickable) return;
    if (revealed) {
      navigate(linkHref!);
    } else {
      // First tap on mobile: reveal content without navigating
      setRevealed(true);
    }
  };

  return (
    <div
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
      onClick={handleClick}
      style={{
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid #e8e5df",
        boxShadow: revealed
          ? "0 8px 32px rgba(0,0,0,0.18)"
          : "0 2px 12px rgba(0,0,0,0.07)",
        background: "#fff",
        position: "relative",
        cursor: isClickable ? "pointer" : "default",
        transition: "box-shadow 0.25s ease, transform 0.25s ease",
        transform: revealed ? "translateY(-4px)" : "translateY(0)",
      }}
    >
      {/* Image */}
      <img
        src={image}
        alt={imageAlt}
        style={{
          width: "100%",
          height: "320px",
          objectFit: "cover",
          display: "block",
          transition: "opacity 0.3s ease",
          opacity: revealed ? 0.15 : 1,
        }}
      />

      {/* Label (hidden when revealed) */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          textAlign: "center",
          transition: "opacity 0.2s ease",
          opacity: revealed ? 0 : 1,
        }}
      >
        <span
          style={{
            fontFamily: "'Sora', 'DM Sans', sans-serif",
            fontSize: "1.25rem",
            fontWeight: "700",
            color: "#0f172a",
          }}
        >
          {label}
        </span>
      </div>

      {/* Revealed overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "2rem",
          opacity: revealed ? 1 : 0,
          transition: "opacity 0.25s ease",
          pointerEvents: revealed ? "auto" : "none",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "4px",
            borderRadius: "2px",
            background: accent,
            marginBottom: "1rem",
          }}
        />
        <h3
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "1.3rem",
            fontWeight: "600",
            color: "#0f172a",
            margin: "0 0 0.75rem",
            lineHeight: "1.3",
          }}
        >
          {heading}
        </h3>
        <p
          style={{
            fontFamily: "'Sora', 'DM Sans', sans-serif",
            fontSize: "0.9rem",
            lineHeight: "1.75",
            color: "#3d3d38",
            margin: 0,
          }}
        >
          {body}
        </p>

        {/* Link label (About / Mission / Platform cards) */}
        {linkHref && linkLabel && (
          <div
            style={{
              marginTop: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              color: accent,
              fontFamily: "'Sora', 'DM Sans', sans-serif",
              fontSize: "0.875rem",
              fontWeight: "700",
              letterSpacing: "0.01em",
              userSelect: "none",
            }}
          >
            {linkLabel}
            <span style={{ fontSize: "1rem", lineHeight: 1 }}>→</span>
          </div>
        )}

        {/* Donate CTA button — sized to match site-wide donate buttons */}
        {cta && (
          <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "center" }}>
            <a
              href={cta.href}
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.625rem 1.5rem",
                borderRadius: "8px",
                background: "#2563eb",
                color: "#fff",
                fontFamily: "'Sora', 'DM Sans', sans-serif",
                fontSize: "0.875rem",
                fontWeight: "600",
                textDecoration: "none",
                transition: "background 0.15s",
                boxShadow: "0 2px 8px rgba(37,99,235,0.15)",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.background = "#1d4ed8")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.background = "#2563eb")
              }
            >
              {cta.text}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SafiraTabbedContent({ lang = "en" }: { lang?: HomeLang }) {
  const { session } = useAuth();
  const isAdmin = session.isAuthenticated && session.roles.includes("admin");
  const allSections = sectionByLang[lang] ?? sectionByLang.en;

  // Filter out admin-only cards for regular users
  const visibleSections = allSections.filter((s) => !s.adminOnly || isAdmin);

  if (isAdmin) {
    // 2×2 grid (About | Mission / Platform | Donate)
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "1.5rem",
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        {visibleSections.map((section) => (
          <SectionCard key={section.label} {...section} />
        ))}
      </div>
    );
  }

  // Non-admin layout:
  // Row 1 — About + Mission side by side
  // Row 2 — Donate centered
  const [about, mission, , donate] = allSections; // skip Platform (index 2)

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        width: "100%",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      {/* Top row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "1.5rem",
        }}
      >
        <SectionCard {...about} />
        <SectionCard {...mission} />
      </div>

      {/* Bottom row — donate centered */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "calc(50% - 0.75rem)" }}>
          <SectionCard {...donate} />
        </div>
      </div>
    </div>
  );
}
