# MedVision Prototype — Design Spec

**Date:** 2026-09-17
**Context:** MedVision Ideathon 2026, SRM Institute — 2-day hackathon prototype
**Theme:** Rural & Affordable Healthcare Solutions

## Problem

India accounts for ~1/3 of global oral cancer cases. Survival at Stage I exceeds 80%, yet 60-80% of patients are diagnosed at Stage III/IV (survival ~30%). Screening happens — ASHA workers examine oral cavities, AI apps classify lesions — but the failure is after: nobody tracks whether lesions change over time, and nobody knows if flagged patients ever reached care.

Existing tools answer "is this lesion suspicious today?" None answer "is this lesion changing, and did this patient get care?"

## Solution

A smartphone-based oral lesion surveillance registry for ASHA workers and Primary Health Centres. The prototype demonstrates all 10 application screens as an interactive web app with simulated AI inference and pre-seeded demo data.

## Prototype Type

Interactive web app (Next.js) styled as a mobile UI inside a phone-frame wrapper. Simulated AI — realistic mock triage results, Grad-CAM heatmaps, and change detection with pre-computed data. No real ML model. All 10 screens from the problem statement implemented.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS 3
- **Animation:** Framer Motion
- **State:** Zustand with localStorage persistence
- **Icons:** Lucide React
- **Font:** Inter (via next/font)

## App Shell & Navigation

### Phone Frame
- Desktop: centered container, 375x812px, 40px rounded corners, on a black (#111111) backdrop with subtle glow
- Mobile viewport: full-screen, no frame

### Navigation
- Bottom tab bar with 4 tabs: Home (Dashboard), Capture, Patients, Settings
- Stack navigation within tabs — back button appears when deep in a stack
- Top bar: screen title, offline/online indicator, back button

### Navigation Flow
```
Bottom Nav:
  Home (Dashboard) ── Screen 4 (Referral Tracking)
                       ├── Screen 7 (Camp Mode) → Screen 1 (Capture)
                       └── Screen 10 (Specialist Review)
  Capture ──────────── Screen 1 (Guided Capture) → Screen 2 (Triage) → Screen 8 (Patient Result)
  Patients ─────────── Patient List
                       ├── Screen 5 (New Patient Intake)
                       └── Screen 6 (Visit Timeline) → Screen 3 (Change Detection)
  Settings ─────────── Screen 9 (Offline Sync) + Reset Demo Data
```

## Screens

### Screen 1 — Guided Capture
- Simulated camera viewfinder (dark background with placeholder)
- Dashed oval overlay guide for lesion alignment
- "Focus ok" / "Move closer" quality badges that toggle on interaction
- Site selector: "Site 2 of 4 · Buccal mucosa, left"
- Tapping "Capture" advances through 4 oral sites
- Progress ring showing capture completion

### Screen 2 — Triage Result
- Captured image with simulated Grad-CAM heatmap overlay (radial gradient, red-orange)
- Color-blocked verdict banner: "Refer urgently" (red), "Monitor" (amber), "Benign" (green)
- Confidence score, image score, habit risk, mouth opening stats
- Disclaimer: "Triage support only. Not a diagnosis."

### Screen 3 — Change Detection (Core Demo)
- Side-by-side comparison of two visit images with dates
- Animated highlight showing lesion growth
- Alert banner: "Lesion grew 22% — Escalated to urgent referral"
- Stats: Area change (+22.4%), Colour shift (White to red), Interval (6 weeks)

### Screen 4 — Referral Tracking Dashboard
- Teal hero section with 3 large stat numbers: Screened (214), Flagged (19), Reached (11)
- Patient list with status badges: Overdue (red pill), Monitor (amber pill), Closed (green pill)
- "Send voice reminders (8)" button

### Screen 5 — Patient Intake
- ABHA number input
- Tobacco habit toggle chips: Gutkha, Khaini, Betel quid, Smoking
- Duration slider
- Live-calculated habit risk score bar (e.g., "High — 7.4 / 10")
- Submit creates patient in Zustand store

### Screen 6 — Visit Timeline
- Teal header with patient name, age, visit count
- Vertical timeline with color-coded dots per visit
- Each entry: date, observation, status badge
- Tapping a visit opens its triage result

### Screen 7 — Camp Mode Queue
- Black header: camp location, offline badge, screened count (56-72pt), avg time
- Token-based waiting queue with New/Recheck labels
- "Start next screening" button triggers Capture flow

### Screen 8 — Patient-Facing Result
- Red/green hero block with large verdict: "See a doctor within 7 days"
- "Play spoken explanation" button (simulates audio with animation)
- Referral details: hospital name, department, available days
- "Directions" and "Remind me" action buttons

### Screen 9 — Offline Sync
- Connection status banner (amber/teal)
- Stats: Visits queued (63), Images pending (241), Queue size (38 MB), Last sync, Model version
- "Simulate Sync" button animates counters to zero

### Screen 10 — Specialist Review
- Dark image review area with lesion image, site/date label
- Patient details, flagging ASHA worker, model tier, growth, habit risk
- Two action buttons: "Call for biopsy" (red) and "Recheck 4 wk" (outline)

## Data Model

### Zustand Store

**patients[]** — id, name, age, abhaNumber, tobaccoHabit {type, duration}, alcoholUse, mouthOpening, habitRiskScore, status (active/referred/closed), createdAt

**visits[]** — id, patientId, date, site (buccal mucosa L/R, tongue, palate), imagePlaceholder, triageResult (benign/monitor/refer), confidence, gradCamData, lesionArea, colourDescription, notes

**referrals[]** — id, patientId, visitId, referredDate, hospital, status (referred/reached/biopsied/closed/overdue), remindersSent

**campSession** — location, date, queue[], screenedCount, avgTime, isOffline

**syncState** — visitsQueued, imagesPending, queueSize, lastSync, modelVersion

### Seed Data (5 patients)

1. **Lakshmi D, 47** — 4 visits, lesion grew 22%, referred, overdue (hero patient for Screen 3)
2. **Murugan S, 55** — 2 visits, stable lesion, recheck in 4 weeks
3. **Anitha R, 38** — 3 visits, biopsy completed, case closed
4. **Ravi K, 42** — New, no visits (in camp queue)
5. **Selvi M, 51** — 1 prior visit, due for recheck (in camp queue)

## Visual Design

### Design DNA
Bold, confident, human. Not a clinical dashboard — a tool that feels approachable to an ASHA worker. Large type, color-blocked sections, imagery that dominates, minimal borders.

### Colors — Color Blocking, Not Tinting
- **Primary:** `#0C8C8C` (deep teal) — full-bleed background blocks
- **Hero accent:** `#E63946` (warm red) — urgent states, CTAs, bold section fills
- **Warm white:** `#FAFAFA` — content areas, form backgrounds
- **Deep black:** `#111111` — text, dark header blocks, phone frame backdrop
- **Soft blue gradient:** `#3B82F6` → `#1D4ED8` — interactive elements, capture overlay
- No grays for backgrounds. Either bold color or clean white.

### Typography — Oversized and Confident
- **Font:** Inter
- **Hero numbers/stats:** 56-72px, black weight
- **Screen titles:** 28-36px, bold
- **Body:** 15-16px, regular, line-height 1.6
- **Labels/captions:** 11-12px, uppercase tracking, medium weight
- Two scales only: large+bold or small+quiet. No medium.

### Screen Color Blocking
| Screen | Top block | Bottom block |
|--------|-----------|--------------|
| Guided Capture | Black/dark with viewfinder | White with controls |
| Triage Result | Red/amber/green with image + Grad-CAM | White with stats |
| Change Detection | Teal header with patient info | White with comparison |
| Referral Dashboard | Deep teal hero with stat numbers | White patient list |
| Patient Intake | White form | Teal bottom with risk score |
| Visit Timeline | Teal header | White timeline |
| Camp Mode | Black header with camp stats | White queue list |
| Patient Result | Red/green hero with verdict | White referral details |
| Offline Sync | Amber/teal status banner | White sync stats |
| Specialist Review | Dark image review area | White action buttons |

### Components
- **Buttons:** Pill-shaped, solid fill, 48px min height
- **Cards:** 20px border-radius, subtle shadow, no borders
- **Status badges:** Large solid-fill pills (not outlined)
- **Habit chips:** Toggle pills — filled when active, outline when inactive
- **Form inputs:** 16px radius, no visible borders, subtle background fill (#F0F0F0)

### Animations (Framer Motion)
- Page transitions: slide + slight scale
- Lesion growth (Screen 3): animated morphing
- Stat counters: count-up on mount
- Buttons: scale on press (0.96)
- Cards: staggered fade-up on lists

### Phone Frame (Desktop)
- Black (#111111) backdrop
- 375x812px, 40px rounded corners, thin bezel, notch
- Subtle glow behind frame

## Project Structure
```
medvision/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── capture/page.tsx
│   ├── triage/page.tsx
│   ├── patients/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── change/page.tsx
│   ├── dashboard/page.tsx
│   ├── camp/page.tsx
│   ├── result/page.tsx
│   ├── sync/page.tsx
│   └── review/page.tsx
├── components/
│   ├── PhoneFrame.tsx
│   ├── BottomNav.tsx
│   ├── TopBar.tsx
│   ├── StatusBadge.tsx
│   ├── StatCard.tsx
│   ├── GradCamOverlay.tsx
│   ├── LesionComparison.tsx
│   ├── HabitChips.tsx
│   ├── RiskScoreBar.tsx
│   ├── TimelineEntry.tsx
│   └── PatientCard.tsx
├── store/useStore.ts
├── data/seed.ts
└── lib/utils.ts
```

## Scope & Limitations

- Simulated AI — no real model inference, pre-computed results
- No real camera — viewfinder is a placeholder with guide overlay
- No actual ABHA/ABDM integration — input field only
- No real voice/TTS — "Play" button triggers a visual animation
- No backend — all state in Zustand/localStorage
- No real offline capability — simulated sync screen only
- Reset Demo Data in Settings restores seed state
