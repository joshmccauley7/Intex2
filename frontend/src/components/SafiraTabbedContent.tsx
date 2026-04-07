import { useState } from "react";
import aboutImg from "../images/tabs/About.jpg";
import missionImg from "../images/tabs/Mission.jpg";
import platformImg from "../images/tabs/Platform.jpg";
import donateImg from "../images/tabs/Donate.jpg";

interface TabContent {
  heading: string;
  body: string;
  accent: string;
  accentLight: string;
  image: string;
  imageAlt: string;
}

interface Tab {
  id: string;
  label: string;
  content: TabContent;
}

const tabs: Tab[] = [
  {
    id: "about",
    label: "About",
    content: {
      heading: "We are Safira.",
      body: "Safira is a nonprofit organization dedicated to providing safe housing, holistic care, and lasting restoration to girls who have survived sex trafficking and abuse. Inspired by the pioneering work of Lighthouse Sanctuary in the Philippines, we are bringing that same model of healing — rooted in hope, dignity, and community — to a new region of the world.",
      accent: "#2563eb",
      accentLight: "#eff6ff",
      image: aboutImg,
      imageAlt: "Safira safe house exterior",
    },
  },
  {
    id: "mission",
    label: "Mission",
    content: {
      heading: "Protecting children. Restoring hope.",
      body: "Our mission is to serve girl survivors with everything they need to thrive: safe shelter, nutritious food, access to education, and a community of people who see, hear, and love them. We are guided by a simple belief — every child deserves to feel safe, valued, and full of possibility. Since 2022, we have served over 40 residents across two shelters.",
      accent: "#7c3aed",
      accentLight: "#f5f3ff",
      image: missionImg,
      imageAlt: "Girls in a classroom learning together",
    },
  },
  {
    id: "platform",
    label: "Platform",
    content: {
      heading: "Technology built for impact.",
      body: "We built a secure, centralized case management platform so our staff can spend less time fighting spreadsheets and more time with the girls they serve. The system tracks resident progress, manages donor relationships, surfaces impact metrics in real time, and uses machine learning to flag at-risk donors before they lapse — all protected behind role-based authentication and GDPR-compliant privacy controls.",
      accent: "#059669",
      accentLight: "#ecfdf5",
      image: platformImg,
      imageAlt: "Screenshot of the Safira admin dashboard",
    },
  },
  {
    id: "donate",
    label: "Donate",
    content: {
      heading: "Your gift changes a life.",
      body: "Every donation to Safira goes directly toward shelter, meals, education, and care for the girls we serve. We believe donors deserve full transparency — that's why our platform gives you access to your giving history, real impact data, and the stories behind the numbers. Whether you give once or become a recurring supporter, you are part of restoring hope.",
      accent: "#dc2626",
      accentLight: "#fef2f2",
      image: donateImg,
      imageAlt: "A child reading a book in the Safira shelter",
    },
  },
];

export default function SafiraTabbedContent() {
  const [activeId, setActiveId] = useState<string>("about");
  const active = tabs.find((t) => t.id === activeId) as Tab;
  const { heading, body, accent, accentLight, image, imageAlt } =
    active.content;

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600&family=Lora:ital,wght@0,400;1,400&display=swap"
        rel="stylesheet"
      />
      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding: "3rem 1.5rem",
          fontFamily: "'Sora', sans-serif",
        }}
      >
        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            background: "#f3f2ee",
            borderRadius: "12px",
            padding: "4px",
            marginBottom: "2rem",
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeId;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveId(tab.id)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  border: "none",
                  borderRadius: "9px",
                  cursor: "pointer",
                  fontFamily: "'Sora', sans-serif",
                  fontSize: "0.8125rem",
                  fontWeight: isActive ? "600" : "400",
                  color: isActive ? "#1a1a18" : "#8a897f",
                  background: isActive ? "#ffffff" : "transparent",
                  boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content card */}
        <div
          key={activeId}
          style={{
            background: "#ffffff",
            border: "1px solid #e8e6e0",
            borderRadius: "16px",
            overflow: "hidden",
            display: "flex",
            minHeight: "280px",
            animation: "fadeSlide 0.25s ease",
          }}
        >
          {/* Left: text content (2/3) */}
          <div
            style={{
              flex: "2",
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid #e8e6e0",
            }}
          >
            {/* Accent strip */}
            <div style={{ height: "4px", background: accent, flexShrink: 0 }} />
            <div
              style={{
                padding: "1.75rem 2rem 2rem",
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
            >
              <h3
                style={{
                  fontFamily: "'Lora', serif",
                  fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)",
                  fontWeight: "400",
                  color: "#1a1a18",
                  margin: "0 0 0.875rem",
                  lineHeight: "1.25",
                }}
              >
                {heading}
              </h3>
              <p
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: "0.9rem",
                  lineHeight: "1.8",
                  color: "#5a5a52",
                  margin: "0 0 1.5rem",
                  flex: 1,
                }}
              >
                {body}
              </p>
            </div>
          </div>

          {/* Right: image (1/3) */}
          <div
            style={{
              flex: "1",
              minWidth: 0,
              padding: "12px 12px 12px 0",
            }}
          >
            <img
              src={image}
              alt={imageAlt}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                borderRadius: "8px",
              }}
            />
          </div>
        </div>

        <style>{`
          @keyframes fadeSlide {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </>
  );
}
