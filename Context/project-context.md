# Intex2 Project Context

## Organization
**Safira** — A fictional nonprofit inspired by Lighthouse Sanctuary, serving girl survivors of sex trafficking and abuse. Building technology to help a new organization replicate this work in another region of the world.

## Personas
**Persona 1: Jordan Reyes (Donor)**
- Values-driven donor who gives intentionally and expects transparency
- Needs: donation history, impact visibility, trustworthy experience
- Pain points: no impact data, clunky donation process, no receipt access

**Persona 2: Jill Harmon (Admin)**
- Nonprofit program coordinator managing 2 safe houses and 40+ residents
- Needs: centralized records, donor lapse alerts, stakeholder reports
- Pain points: everything is spreadsheets, no single source of truth, manual reporting

**Justification:** Jill keeps the mission running and Jordan funds it — if the system doesn't work for both, nothing else matters.

## Problem Statement
Equip under-resourced nonprofits with a secure, centralized platform to manage cases, retain donors, and make smarter decisions — so staff spend less time fighting systems and more time saving lives.

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS v3 |
| Icons | Lucide React |
| Routing | React Router DOM |
| Backend | .NET 10 / C# |
| Database | PostgreSQL (Railway) |
| Frontend Hosting | Vercel |
| Backend Hosting | Railway |

## Deployed URLs
| Service | URL |
|---|---|
| Frontend (Vercel) | https://frontend-theta-orcin-86.vercel.app |
| Backend API (Railway) | https://backendapi-production-5f83.up.railway.app |
| Database (Railway) | maglev.proxy.rlwy.net:21378 |

## Database
- **Service name:** intexwinter (Railway — School_Projects workspace)
- **Database:** railway
- **User:** postgres
- **Public host:** maglev.proxy.rlwy.net:21378
- **17 tables** — all imported and populated

---

## Design System

### Brand
- **Name:** Safira
- **Logo:** Heart icon (Lucide `<Heart />`) filled with `#2563eb` + bold "Safira" text in navy
- **Tagline:** "Protecting children and restoring hope since 2022."

### Colors
| Name | Hex | Tailwind Class | Usage |
|---|---|---|---|
| Navy (primary dark) | `#0f172a` | `bg-navy-DEFAULT` / `text-navy-DEFAULT` | Navbar, footer, headings |
| Navy light | `#1e293b` | `bg-navy-light` | Sidebar, dark cards |
| Safira Blue | `#2563eb` | `bg-safira-blue` / `text-safira-blue` | Primary buttons, accents, logo |
| Safira Blue Dark | `#1d4ed8` | `bg-safira-blue-dark` | Button hover states |
| Slate 50 | `#f8fafc` | `bg-slate-50` | Page backgrounds, card backgrounds |
| Slate 600 | `#475569` | `text-slate-600` | Body text |
| Slate 400/500 | `#94a3b8` | `text-slate-400/500` | Muted text, footer text |
| White | `#ffffff` | `bg-white` | Card backgrounds, text on dark |

### Typography
- **Font:** Inter (Google Fonts) — loaded in `index.css`
- **Headings:** `font-bold`, sizes `text-3xl` to `text-5xl`
- **Body:** `text-base` (16px), `text-slate-600`, `leading-relaxed`
- **Labels/small:** `text-sm`, `text-slate-500`, `font-medium`
- **Nav links:** `text-sm font-medium text-slate-300`, active = `text-white`

### Spacing & Layout
- Page max-width: `max-w-5xl mx-auto` (sections), `max-w-2xl mx-auto` (centered content)
- Section padding: `py-20 px-6`
- Card padding: `p-8`
- Card style: `bg-slate-50 rounded-xl border border-slate-100`
- Gap between grid items: `gap-6`

### Components

#### Navbar
```tsx
<nav className="bg-navy-DEFAULT text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50">
  <div className="flex items-center gap-2 font-bold text-xl">
    <Heart className="text-safira-blue fill-safira-blue" size={22} />
    Safira
  </div>
  {/* nav links: text-sm font-medium text-slate-300, active = text-white */}
  {/* CTA button: bg-safira-blue rounded-lg px-4 py-2 text-sm font-semibold */}
</nav>
```

#### Primary Button
```tsx
<a className="bg-safira-blue hover:bg-safira-blue-dark text-white font-semibold px-8 py-3 rounded-lg transition-colors">
```

#### Stat Card
```tsx
<div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-100">
  <Icon className="mx-auto mb-3 text-safira-blue" size={28} />
  <div className="text-4xl font-bold text-navy-DEFAULT mb-1">{value}</div>
  <div className="text-sm text-slate-500 font-medium">{label}</div>
</div>
```

#### Admin Sidebar (for all admin pages)
```tsx
<aside className="w-56 bg-navy-DEFAULT text-white min-h-screen flex flex-col">
  {/* Logo at top */}
  {/* Nav items: flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-navy-light hover:text-white rounded-lg */}
  {/* Active nav item: bg-navy-light text-white */}
  {/* "Back to Site" link at bottom */}
</aside>
```

#### Admin Dashboard Card (metric)
```tsx
<div className="bg-white rounded-xl border border-slate-200 p-6 flex items-start justify-between">
  <div>
    <p className="text-sm text-slate-500 mb-1">{label}</p>
    <p className="text-3xl font-bold text-navy-DEFAULT">{value}</p>
  </div>
  <Icon className="text-safira-blue" size={24} />
</div>
```

#### Footer
```tsx
<footer className="bg-navy-DEFAULT text-slate-400 py-12 px-6">
  {/* 4-column grid: Brand | Quick Links | Contact | Follow Us */}
  {/* Bottom bar: border-t border-slate-700, copyright left, Privacy Policy right */}
</footer>
```

### Admin Layout Pattern
All admin pages share this layout:
```
┌─────────────────────────────────────────┐
│ Sidebar (w-56, bg-navy-DEFAULT)         │
│  Logo                                   │
│  Dashboard                              │  Main content area (flex-1, bg-slate-50)
│  Residents                              │  ├── Page title (text-2xl font-bold)
│  Donors                                 │  ├── Metric cards row
│  Reports                                │  ├── Tables / charts / forms
│  Settings                               │
│  ─────────                              │
│  Back to Site                           │
└─────────────────────────────────────────┘
```

### Page Layout Pattern (public pages)
```
Navbar (sticky, bg-navy-DEFAULT)
Hero (bg-cover, overlay bg-navy-DEFAULT/70, centered text)
Content sections (alternating bg-white / bg-slate-50)
CTA section (bg-safira-blue)
Footer (bg-navy-DEFAULT)
```

---

## Environment Variables
### Backend (.env — gitignored, lives in backend/Intex2/Intex2/)
```
DATABASE_URL=postgresql://postgres:<password>@maglev.proxy.rlwy.net:21378/railway
```
### Frontend (.env.local — gitignored, for local dev)
```
VITE_API_BASE_URL=http://localhost:5254
```
### Frontend (set in Vercel dashboard, for production)
```
VITE_API_BASE_URL=https://backendapi-production-5f83.up.railway.app
```

## API Calls (Frontend)
Use the `apiFetch` helper from `src/api.ts`:
```ts
import { apiFetch } from '../api'
const data = await apiFetch('/api/residents')
```

## Pages to Build (IS 413)
### Public
- [x] Home / Landing Page — built, pulls live DB data
- [ ] Impact / Donor-Facing Dashboard
- [ ] Login Page
- [ ] Privacy Policy + Cookie Consent

### Admin (Authenticated)
- [ ] Admin Dashboard
- [ ] Donors & Contributions
- [ ] Caseload Inventory
- [ ] Process Recording
- [ ] Home Visitation & Case Conferences
- [ ] Reports & Analytics

## ML Pipelines to Build (IS 455)
1. **Donor Churn Predictor** — predict which donors are at risk of lapsing; deployed as risk flag on donor page
2. **Social Media → Donation Conversion Predictor** — predict which post characteristics drive donations; deployed as a post recommendation tool

## Security Requirements (IS 414)
- [ ] HTTPS + HTTP → HTTPS redirect
- [ ] ASP.NET Identity with strict password policy
- [ ] RBAC (admin, donor, public roles)
- [ ] Protected API endpoints
- [ ] Delete confirmation UI
- [ ] Credentials in env vars (not GitHub)
- [ ] GDPR privacy policy
- [ ] GDPR cookie consent (functional)
- [ ] Content-Security-Policy HTTP header

## Repository Structure
```
Intex2/
├── Context/               # Case docs, project context, personas
├── DB/
│   ├── lighthouse_csv_v7/ # 17 source CSV tables (all imported)
│   ├── schema.sql         # Database schema
│   └── sample_logins.sql  # Sample admin login seed
├── MachineLearning/       # ML notebooks (to be built)
├── backend/
│   └── Intex2/
│       ├── Dockerfile
│       ├── Intex2/        # .NET 10 C# project
│       │   ├── Program.cs
│       │   ├── AppDbContext.cs
│       │   ├── Models/    # EF Core model classes
│       │   ├── Controllers/
│       │   └── .env       # Local credentials (gitignored)
│       └── railway.toml
├── frontend/
│   ├── src/
│   │   ├── api.ts         # Central API fetch utility
│   │   ├── App.tsx        # Home page
│   │   └── assets/        # Images
│   ├── tailwind.config.js
│   ├── .env.local         # VITE_API_BASE_URL for local dev (gitignored)
│   └── .env.example
└── .gitignore
```

## MoSCoW Summary
**Must Have:** All IS 413 pages, auth/RBAC, HTTPS, CSP header, cookie consent, privacy policy, ML pipelines deployed, database imported
**Should Have:** Donation allocations, partner management, social media performance table, pagination, mobile responsiveness, accessibility ≥90%, OKR metric
**Could Have:** Dark/light mode cookie, donor lapse flag from ML, HSTS, data sanitization, third-party auth, Docker
**Won't Have:** MFA/2FA (grading blocker — graders can't use our phones)
