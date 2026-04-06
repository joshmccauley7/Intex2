# Intex2 Project Context

## Organization
Fictional nonprofit inspired by Lighthouse Sanctuary — a safe house organization serving girl survivors of sex trafficking and abuse. We are building technology to help a new organization replicate this work in another region of the world.

## Personas
**Persona 1: Jordan Reyes (Donor)**
- Values-driven donor who gives intentionally and expects transparency
- Needs: donation history, impact visibility, trustworthy experience
- Pain points: no impact data, clunky donation process, no receipt access

**Persona 2: Jill Harmon (Admin)**
- Nonprofit program coordinator managing 2 safe houses and 40+ residents
- Needs: centralized records, donor lapse alerts, stakeholder reports
- Pain points: everything is spreadsheets, no single source of truth, manual reporting

**Justification:** Jill keeps the mission running and Nike funds it — if the system doesn't work for both, nothing else matters.

## Problem Statement
Equip under-resourced nonprofits with a secure, centralized platform to manage cases, retain donors, and make smarter decisions — so staff spend less time fighting systems and more time saving lives.

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
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
- **17 CSV tables** provided in DB/lighthouse_csv_v7/ — not yet imported into the live database

## Repository Structure
```
Intex2/
├── Context/               # Case docs, project context, personas
├── DB/
│   ├── lighthouse_csv_v7/ # 17 source CSV tables
│   ├── schema.sql         # Database schema (to be filled)
│   └── sample_logins.sql  # Sample admin login seed
├── MachineLearning/       # ML notebooks (to be built)
├── backend/
│   └── Intex2/
│       ├── Dockerfile     # Railway deployment
│       ├── Intex2/        # .NET 10 C# project
│       │   ├── Program.cs
│       │   ├── AppDbContext.cs
│       │   ├── .env       # Local credentials (gitignored)
│       │   └── Intex2.csproj
│       └── railway.toml   # Points Railway to Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api.ts         # Central API fetch utility
│   │   └── App.tsx
│   ├── .env               # VITE_API_BASE_URL for production
│   └── .env.local         # VITE_API_BASE_URL for local dev
├── railway.toml            # Railway build config
└── .gitignore
```

## Environment Variables
### Backend (.env — gitignored)
```
DATABASE_URL=postgresql://postgres:<password>@maglev.proxy.rlwy.net:21378/railway
```
### Frontend (.env.local — gitignored, for local dev)
```
VITE_API_BASE_URL=http://localhost:5000
```
### Frontend (.env — gitignored, for production)
```
VITE_API_BASE_URL=https://backendapi-production-5f83.up.railway.app
```

## API Calls (Frontend)
Use the `apiFetch` helper from `src/api.ts`:
```ts
import { apiFetch } from './api';
const data = await apiFetch('/api/residents');
```

## Pages to Build (IS 413)
### Public
- [ ] Home / Landing Page
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

## MoSCoW Summary
**Must Have:** All IS 413 pages, auth/RBAC, HTTPS, CSP header, cookie consent, privacy policy, ML pipelines deployed, database imported  
**Should Have:** Donation allocations, partner management, social media performance table, pagination, mobile responsiveness, accessibility ≥90%, OKR metric  
**Could Have:** Dark/light mode cookie, donor lapse flag from ML, HSTS, data sanitization, third-party auth, Docker  
**Won't Have:** MFA/2FA (grading blocker — graders can't use our phones)
