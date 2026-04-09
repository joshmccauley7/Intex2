import { useState } from "react";
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
}[]> = {
  en: [
  {
    label: "About",
    image: aboutImg,
    imageAlt: "Safira safe house exterior",
    accent: "#2563eb",
    heading: "We are Safira.",
    body: "Safira is a nonprofit organization dedicated to providing safe housing, holistic care, and lasting restoration to girls who have survived sex trafficking and abuse. Inspired by the pioneering work of Lighthouse Sanctuary in the Philippines, we are bringing that same model of healing — rooted in hope, dignity, and community — to a new region of the world.",
  },
  {
    label: "Mission",
    image: missionImg,
    imageAlt: "Girls learning together",
    accent: "#7c3aed",
    heading: "Protecting children. Restoring hope.",
    body: "Our mission is to serve girl survivors with everything they need to thrive: safe shelter, nutritious food, access to education, and a community of people who see, hear, and love them. We are guided by a simple belief — every child deserves to feel safe, valued, and full of possibility.",
  },
  {
    label: "Platform",
    image: platformImg,
    imageAlt: "Safira admin dashboard",
    accent: "#059669",
    heading: "Technology built for impact.",
    body: "We built a secure, centralized case management platform so our staff can spend less time fighting spreadsheets and more time with the girls they serve. The system tracks resident progress, manages donor relationships, and surfaces real-time impact metrics — all protected behind role-based authentication.",
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
    },
    {
      label: "Missao",
      image: missionImg,
      imageAlt: "Meninas estudando juntas",
      accent: "#7c3aed",
      heading: "Protegendo criancas. Restaurando esperanca.",
      body: "Nossa missao e servir meninas sobreviventes com tudo o que precisam para prosperar: abrigo seguro, alimentacao, acesso a educacao e uma comunidade que as ve, escuta e ama.",
    },
    {
      label: "Plataforma",
      image: platformImg,
      imageAlt: "Painel administrativo da Safira",
      accent: "#059669",
      heading: "Tecnologia para gerar impacto.",
      body: "Criamos uma plataforma segura e centralizada para que nossa equipe gaste menos tempo com planilhas e mais tempo com as meninas que atende.",
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
    },
    {
      label: "Misyon",
      image: missionImg,
      imageAlt: "Mga batang sabay na natututo",
      accent: "#7c3aed",
      heading: "Pagprotekta sa mga bata. Pagpapanumbalik ng pag-asa.",
      body: "Misyon naming tulungan ang mga survivor gamit ang mga kailangan nila para umunlad: ligtas na tahanan, masustansyang pagkain, edukasyon, at komunidad na tunay na nagmamalasakit.",
    },
    {
      label: "Plataporma",
      image: platformImg,
      imageAlt: "Safira admin dashboard",
      accent: "#059669",
      heading: "Teknolohiyang ginawa para sa epekto.",
      body: "Gumawa kami ng secure at centralized na platform para mas kaunting oras sa spreadsheets at mas maraming oras sa mga batang pinaglilingkuran.",
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

function SectionCard({ label, image, imageAlt, accent, heading, body, cta }: (typeof sectionByLang)["en"][0]) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid #e8e5df",
        boxShadow: hovered ? "0 8px 32px rgba(0,0,0,0.18)" : "0 2px 12px rgba(0,0,0,0.07)",
        background: "#fff",
        position: "relative",
        cursor: "default",
        transition: "box-shadow 0.25s ease, transform 0.25s ease",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
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
          opacity: hovered ? 0.15 : 1,
        }}
      />

      {/* Label (hidden on hover) */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          textAlign: "center",
          transition: "opacity 0.2s ease",
          opacity: hovered ? 0 : 1,
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

      {/* Hover overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "2rem",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.25s ease",
          pointerEvents: hovered ? "auto" : "none",
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
        {cta && (
          <a
            href={cta.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              marginTop: "1.25rem",
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#fff",
              fontFamily: "'Sora', 'DM Sans', sans-serif",
              fontSize: "0.875rem",
              fontWeight: "600",
              textDecoration: "none",
              transition: "background 0.15s",
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#1d4ed8")}
            onMouseLeave={e => (e.currentTarget.style.background = "#2563eb")}
          >
            {cta.text}
          </a>
        )}
      </div>
    </div>
  );
}

export default function SafiraTabbedContent({ homeLang = "en" }: { homeLang?: HomeLang }) {
  const sections = sectionByLang[homeLang];
  return (
    <section style={{ background: "#ffffff", padding: "4rem 1.5rem" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "1.5rem",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {sections.map((s) => (
          <SectionCard key={s.label} {...s} />
        ))}
      </div>
    </section>
  );
}
