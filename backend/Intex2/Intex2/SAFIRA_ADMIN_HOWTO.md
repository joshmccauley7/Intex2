# Safira Admin Platform — How-To Guide

This guide explains every section of the Safira admin platform: what each metric means, how to filter and navigate data, and how to use the AI Helper. Reference this whenever something is unclear.

---

## Table of Contents

1. [The Admin Dashboard](#1-the-admin-dashboard)
2. [Resident Operations](#2-resident-operations)
3. [Donor Operations](#3-donor-operations)
4. [Social Media](#4-social-media)
5. [Filtering Data by Period](#5-filtering-data-by-period)
6. [Navigating Modals and Detail Views](#6-navigating-modals-and-detail-views)
7. [The AI Helper Chat](#7-the-ai-helper-chat)
8. [Reporting a Bug](#8-reporting-a-bug)
9. [Other Admin Pages](#9-other-admin-pages)
10. [Understanding Risk and Churn Scores](#10-understanding-risk-and-churn-scores)

---

## 1. The Admin Dashboard

The Admin Dashboard is your central hub. Reach it at **/admin/dashboard** or through the navigation bar.

The dashboard is divided into collapsible sections. Each section shows a summary card — click any card to open a **full-detail modal** with tables, charts, and pagination.

**Key sections at a glance:**

- **Resident Operations** — active residents, safehouses, health, education, counseling, upcoming case conferences
- **Donor Operations** — active donors, recent donations, churn risk tiers, lapsed donors, retention OKR
- **Risk & Incident Management** — resident risk distribution, donor churn distribution

The dashboard auto-loads all data when you open it. To refresh, reload the page.

---

## 2. Resident Operations

### Active Residents

Shows every resident currently in a safehouse with status **Active**. Columns include:

- **Name** — resident's name
- **Risk Level** — High, Medium, or Low (see [Section 10](#10-understanding-risk-and-churn-scores))
- **Safehouse** — which safehouse they are currently placed in
- **Admission Date** — when they entered the program

Click a row in the modal to navigate directly to that resident's full profile on the Residents page.

### Active Safehouses

Lists each safehouse with:

- **Capacity** — maximum number of residents the safehouse can hold
- **Occupancy %** — current residents ÷ capacity × 100. A safehouse at 100% is full; plan transfers accordingly.

### Resident Status Breakdown

A bar chart and count showing how many residents are in each status category: **Active**, **Closed**, and **Transferred**. Useful for tracking overall throughput and reintegration progress.

### Health & Wellbeing

Displays average scores across four wellbeing dimensions:

- **General Health** — overall physical health score (0–10)
- **Nutrition** — diet and meal adequacy score (0–10)
- **Sleep** — sleep quality score (0–10)
- **Energy** — daily energy level score (0–10)

Scores are pulled from the most recent health record for each active resident. Low scores in any category flag residents who may need additional support.

### Education

- **Attendance Rate** — percentage of scheduled school/program sessions attended, averaged across active residents
- **Progress %** — academic or program progress percentage from the most recent education record

### Counseling Sessions

A log of recent process recording sessions (counseling, therapy, group sessions). Columns:

- **Resident** — who the session was for
- **Session Type** — type of intervention (e.g., individual counseling, group therapy)
- **Date** — when the session took place
- **Duration** — length in minutes
- **Social Worker** — the staff member who conducted the session

### Upcoming Case Conferences

Shows scheduled case conferences in the near future. Case conferences are formal reviews of a resident's progress and plans. Columns: Resident, Conference Type, Date, Social Worker.

---

## 3. Donor Operations

### Active Donors

Lists all supporters who have made at least one donation. Columns:

- **Name / Organization** — donor's display name
- **Last Donation** — date of their most recent gift
- **Total Lifetime** — cumulative amount donated across all time
- **Gift Count** — total number of individual donations made

Click a row to open that donor's full profile on the Donors page.

### Recent Donations

A running log of the most recent individual donations. Columns:

- **Donor** — who gave
- **Date** — when the gift was received
- **Amount** — donation value (in Philippine Pesos ₱)
- **Type** — one-time or monthly recurring
- **Campaign** — if tied to a specific fundraising campaign

### Churn Risk Tiers

Donors are automatically scored for churn risk (likelihood of stopping donations) by the Churn Scoring Service. They are grouped into three tiers:

- **High Risk** — probability > 70%. These donors need immediate re-engagement outreach.
- **Medium Risk** — probability 40–70%. Monitor and send a warm check-in.
- **Low Risk** — probability < 40%. Healthy, engaged donors.

See [Section 10](#10-understanding-risk-and-churn-scores) for how the score is calculated.

### Donor Retention (OKR)

Shows donors who gave in the most recent period and labels each with a retention status badge. This is your primary **Objective & Key Result** for donor health. The goal is to keep recent donors active and progressing toward larger or more frequent gifts.

### Lapsed Donors

Donors who have not made any donation in the past **6 months**. Columns include their last donation date and total lifetime value, so you can prioritize re-engagement by highest value donors first.

Use the AI Helper's "Draft a re-engagement email" prompt to quickly generate personalized outreach for lapsed donors.

---

## 4. Social Media

The Social Media section (also accessible at **/admin/social-media**) tracks your organization's posts.

### Top Performing Content

Posts ranked by **engagement** (likes + comments + shares) and **reach** (total accounts reached). Use this to understand what content resonates with your audience and replicate those formats.

### Creating and Managing Posts

On the Social Media page you can log posts, record their metrics, and track performance over time. Posts are stored in the Safira database so you have a consistent record independent of any social platform.

### AI-Assisted Content

The AI Helper can draft posts for you:

- **Draft an awareness post** — creates a trauma-informed, mission-aligned social post for awareness campaigns
- **Post ideas** — generates 3 fresh content ideas based on your mission and recent activity
- **Content calendar suggestions** — builds a monthly posting plan
- **Tone check** — reviews a draft post for trauma-informed, sensitive language before you publish

---

## 5. Filtering Data by Period

Many sections of the dashboard and their detail modals include a **period filter** in the top-right corner. Options:

- **All Time** — every record since program inception
- **3 Months** — the past 90 days
- **6 Months** — the past 180 days
- **12 Months** — the past 365 days

Click the desired period and the data in that section will reload automatically. The filter applies to donations, sessions, education records, and health records, making it easy to see trends over a specific window.

---

## 6. Navigating Modals and Detail Views

Clicking any summary card on the dashboard opens a **modal overlay** with:

1. **A summary bar** — KPI badges (totals, averages, counts) shown at the top
2. **A data table** — paginated at 100 rows per page; use the page arrows at the bottom to navigate
3. **A chart** (where applicable) — bar charts for status breakdowns, churn tiers, etc.
4. **A period filter** — top-right of the modal (see Section 5)
5. **Row click navigation** — clicking a resident or donor row opens their full profile page in the main admin area

To close a modal, click the **×** button in the top-right corner or press **Escape**.

---

## 7. The AI Helper Chat

The AI Helper is the blue **"AI Helper"** button in the bottom-left corner of every admin page. It is only visible to admins.

### Starting a Conversation

Click the button to open the chat panel. You will see four category buttons:

- **A Resident 🏠** — questions about specific residents, safety concerns, follow-ups, case status
- **Donors 💛** — donor health, churn risk, giving summaries, drafting outreach emails
- **Social Media 📣** — top content, post drafts, content calendars, tone review
- **How To / Help ❓** — explanations of dashboard sections, metrics, and how to use filters
- **I have an app error 🐛** — report a bug or unexpected behavior (see Section 8)
- **Something else 💬** — free-form question about anything on the platform

### Using Suggested Prompts

After selecting a category (except "Something else"), you will see up to five **suggested prompt chips**. Clicking one sends a pre-crafted question and gets an immediate, data-driven answer. You can also type your own question in the text box at the bottom.

### Response Types

The AI uses three response strategies depending on your question:

- **Instant DB** (fastest) — pre-configured questions like "Churn risk donors" or "30+ day residents" query the database directly with no AI call. You get the data in seconds.
- **Summarized + narrated** — for overview questions, the system pulls aggregated data and Claude writes a brief narrative around it.
- **Full AI** — for creative tasks (drafting emails, writing posts, content calendars) the AI receives rich context from the database and generates a full response.

### Tips

- For resident questions, you can mention a resident's case control number (e.g., LS-0002) or name for specific lookups.
- For donor questions, mention the donor's name for individual insights.
- You can ask date-range questions like "donations in Q3 2025" or "residents admitted last month."
- Click "Start over" in the header to reset the conversation and pick a new category.
- Long responses show a "Show more" link — click to expand.
- The AI can draft emails, post copy, and reports — just describe what you need.

---

## 8. Reporting a Bug

If you encounter unexpected behavior — a page that won't load, incorrect data, a button that doesn't work, or any other error — you can report it directly through the AI Helper.

### How to Report

1. Open the AI Helper (bottom-left button)
2. Click **"I have an app error 🐛"**
3. The AI will ask you to describe the issue. Include:
   - **What page you were on** (e.g., "the Donors modal on the dashboard")
   - **What you were trying to do** (e.g., "clicking on a donor row to view their profile")
   - **What happened** (e.g., "the page went blank / showed an error / the number looked wrong")
4. Type your description and submit
5. The report is saved automatically. A team member will review it and follow up.

### Who Reviews Reports

Bug reports are stored in the database and accessible to the development team. Reports are marked **Open** when submitted, then updated to **Reviewed** and eventually **Resolved** as the issue is investigated and fixed.

---

## 9. Other Admin Pages

In addition to the dashboard, the admin navigation gives you access to:

### /admin/residents

Full resident management. You can view profiles, edit case details, log health and wellbeing records, education records, and more. Click any resident row to open their profile.

### /admin/donors

Full donor management. View supporter profiles, donation history, churn scores, and contact information.

### /admin/home-visitations

Log and review home visitation records. Visitations are linked to residents and track safety flags, environment assessment, and follow-up requirements.

### /admin/process-recordings

Log counseling and therapy sessions. Each recording is linked to a resident and captures session type, emotional state observations, interventions applied, and follow-up actions.

### /admin/social-media

Create and manage social media post records with engagement metrics.

### /admin/users

Manage admin and donor user accounts — create, view, and manage platform access.

---

## 10. Understanding Risk and Churn Scores

### Resident Risk Level

Each resident is assigned a **risk level** (High, Medium, Low) calculated automatically by the Resident Status Calculator. The score considers:

- **Unresolved incident reports** — any high or critical severity incidents that are not yet resolved push the resident toward High risk
- **Home visitation safety flags** — flags raised during recent visits contribute to elevated risk
- **Reintegration progress** — residents who are behind on education, counseling, or health targets may have elevated risk
- **Length of stay** — very long stays (30+ days) may indicate difficulty transitioning

**High risk** residents should receive priority attention from case workers. The AI Helper's "Who needs attention?" prompt surfaces these residents automatically.

### Donor Churn Probability

Each donor receives a **churn probability score** (0–100%) generated by the Churn Scoring Service. The model considers:

- **Recency** — how long since their last donation (longer gaps = higher risk)
- **Frequency** — how often they have donated historically (less frequent = higher risk)
- **Total value** — lower-value donors tend to churn at higher rates
- **Donation type** — one-time donors churn faster than monthly recurring donors

The score is updated periodically and stored in the `donor_churn_predictions` table.

| Score Range | Tier | Recommended Action |
|-------------|------|--------------------|
| 70–100% | High Risk | Immediate personal outreach |
| 40–69% | Medium Risk | Send a warm check-in message |
| 0–39% | Low Risk | Continue regular communication |

Use the AI Helper's "Draft a re-engagement email" or "Draft a thank-you message" prompts to quickly create outreach content for any tier.
