# MedVision Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 10-screen interactive web prototype of the MedVision oral cancer surveillance app, styled as a mobile UI inside a phone frame, with simulated AI and pre-seeded demo data.

**Architecture:** Next.js 14 App Router with client-side Zustand state. Every screen is a page under `app/`. A `PhoneFrame` wrapper in the root layout provides the mobile device look on desktop. Framer Motion handles page transitions and micro-interactions. All data is pre-seeded and persisted to localStorage — no backend.

**Tech Stack:** Next.js 14, Tailwind CSS 3, Framer Motion, Zustand, Lucide React, Inter font

## Global Constraints

- Node 18+, npm
- All components are client components (`"use client"`) — no SSR for this prototype
- Colors: Primary `#0C8C8C`, Danger `#E63946`, Warning `#F59E0B`, Success `#16A34A`, Black `#111111`, White `#FAFAFA`
- Typography: Inter font, hero numbers 56-72px black weight, titles 28-36px bold, body 15-16px, captions 11-12px uppercase
- All screens render at 375px max-width inside phone frame on desktop
- No grays for section backgrounds — either bold color or clean white
- Buttons: pill-shaped (full rounded), 48px min height, solid fill
- Cards: 20px border-radius, subtle shadow, no borders
- Status badges: solid-fill pills, not outlined

---

### Task 1: Project Scaffold & Data Layer

**Files:**
- Create: `package.json`, `tailwind.config.ts`, `tsconfig.json`, `app/globals.css`, `next.config.js`
- Create: `lib/types.ts`
- Create: `data/seed.ts`
- Create: `store/useStore.ts`
- Create: `lib/utils.ts`

**Interfaces:**
- Produces: All TypeScript types (`Patient`, `Visit`, `Referral`, `CampSession`, `SyncState`), Zustand store hook `useStore()`, seed data constants, utility functions (`formatDate`, `getRiskLabel`, `getRiskColor`, `getStatusColor`)

- [ ] **Step 1: Scaffold Next.js project**

Run from `D:\MedVision`:

```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

When prompted, accept defaults. This populates the directory with Next.js boilerplate.

- [ ] **Step 2: Install dependencies**

```bash
npm install framer-motion zustand lucide-react
```

- [ ] **Step 3: Configure Tailwind with project colors**

Replace `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
    "./store/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0C8C8C",
        "primary-dark": "#0A7070",
        danger: "#E63946",
        "danger-light": "#FEE2E2",
        warning: "#F59E0B",
        "warning-light": "#FEF3C7",
        success: "#16A34A",
        "success-light": "#DCFCE7",
        dark: "#111111",
        "warm-white": "#FAFAFA",
        muted: "#6B7280",
        "input-bg": "#F0F0F0",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
        pill: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 4: Set up global styles**

Replace `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: #0C8C8C;
  --color-danger: #E63946;
  --color-warning: #F59E0B;
  --color-success: #16A34A;
}

body {
  background-color: #111111;
  overflow: hidden;
}

/* Hide scrollbar but allow scrolling inside phone frame */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Count-up animation */
@keyframes countUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 5: Create TypeScript types**

Create `lib/types.ts`:

```ts
export type TobaccoType = "gutkha" | "khaini" | "betel_quid" | "smoking";

export type TriageResult = "benign" | "monitor" | "refer";

export type PatientStatus = "active" | "referred" | "closed";

export type ReferralStatus =
  | "referred"
  | "reached"
  | "biopsied"
  | "closed"
  | "overdue";

export type OralSite =
  | "buccal_mucosa_left"
  | "buccal_mucosa_right"
  | "tongue"
  | "palate";

export const ORAL_SITE_LABELS: Record<OralSite, string> = {
  buccal_mucosa_left: "Buccal mucosa, left",
  buccal_mucosa_right: "Buccal mucosa, right",
  tongue: "Tongue",
  palate: "Palate",
};

export interface Patient {
  id: string;
  name: string;
  age: number;
  abhaNumber: string;
  tobaccoHabit: {
    types: TobaccoType[];
    durationYears: number;
  };
  alcoholUse: boolean;
  mouthOpening: number;
  habitRiskScore: number;
  status: PatientStatus;
  createdAt: string;
}

export interface Visit {
  id: string;
  patientId: string;
  date: string;
  site: OralSite;
  triageResult: TriageResult;
  confidence: number;
  lesionAreaMm2: number;
  colourDescription: string;
  notes: string;
}

export interface Referral {
  id: string;
  patientId: string;
  visitId: string;
  referredDate: string;
  hospital: string;
  department: string;
  availableDays: string;
  status: ReferralStatus;
  remindersSent: number;
}

export interface CampSession {
  location: string;
  date: string;
  queue: { token: number; patientId: string; type: "new" | "recheck" }[];
  screenedCount: number;
  avgTimeSeconds: number;
  isOffline: boolean;
}

export interface SyncState {
  visitsQueued: number;
  imagesPending: number;
  queueSizeMb: number;
  lastSync: string;
  modelVersion: string;
}
```

- [ ] **Step 6: Create seed data**

Create `data/seed.ts`:

```ts
import {
  Patient,
  Visit,
  Referral,
  CampSession,
  SyncState,
} from "@/lib/types";

export const seedPatients: Patient[] = [
  {
    id: "p1",
    name: "Lakshmi D",
    age: 47,
    abhaNumber: "91 4402 8871 4412",
    tobaccoHabit: { types: ["gutkha", "betel_quid"], durationYears: 11 },
    alcoholUse: false,
    mouthOpening: 32,
    habitRiskScore: 7.4,
    status: "referred",
    createdAt: "2026-02-14",
  },
  {
    id: "p2",
    name: "Murugan S",
    age: 55,
    abhaNumber: "91 5501 2234 7890",
    tobaccoHabit: { types: ["khaini"], durationYears: 20 },
    alcoholUse: true,
    mouthOpening: 38,
    habitRiskScore: 6.1,
    status: "active",
    createdAt: "2026-04-10",
  },
  {
    id: "p3",
    name: "Anitha R",
    age: 38,
    abhaNumber: "91 3301 5567 2345",
    tobaccoHabit: { types: ["betel_quid"], durationYears: 8 },
    alcoholUse: false,
    mouthOpening: 40,
    habitRiskScore: 4.2,
    status: "closed",
    createdAt: "2026-03-01",
  },
  {
    id: "p4",
    name: "Ravi K",
    age: 42,
    abhaNumber: "91 4201 9988 1122",
    tobaccoHabit: { types: ["gutkha", "smoking"], durationYears: 15 },
    alcoholUse: true,
    mouthOpening: 35,
    habitRiskScore: 8.1,
    status: "active",
    createdAt: "2026-09-17",
  },
  {
    id: "p5",
    name: "Selvi M",
    age: 51,
    abhaNumber: "91 5101 3344 5566",
    tobaccoHabit: { types: ["betel_quid"], durationYears: 18 },
    alcoholUse: false,
    mouthOpening: 30,
    habitRiskScore: 6.8,
    status: "active",
    createdAt: "2026-07-20",
  },
];

export const seedVisits: Visit[] = [
  {
    id: "v1",
    patientId: "p1",
    date: "2026-02-14",
    site: "buccal_mucosa_left",
    triageResult: "monitor",
    confidence: 0.72,
    lesionAreaMm2: 16,
    colourDescription: "White patch",
    notes: "Baseline, white patch 4 mm diameter",
  },
  {
    id: "v2",
    patientId: "p1",
    date: "2026-05-02",
    site: "buccal_mucosa_left",
    triageResult: "monitor",
    confidence: 0.74,
    lesionAreaMm2: 16.5,
    colourDescription: "White patch",
    notes: "Stable, +3% area",
  },
  {
    id: "v3",
    patientId: "p1",
    date: "2026-07-28",
    site: "buccal_mucosa_left",
    triageResult: "monitor",
    confidence: 0.81,
    lesionAreaMm2: 17.8,
    colourDescription: "White with red margin",
    notes: "Colour change noted at margins",
  },
  {
    id: "v4",
    patientId: "p1",
    date: "2026-09-08",
    site: "buccal_mucosa_left",
    triageResult: "refer",
    confidence: 0.87,
    lesionAreaMm2: 21.8,
    colourDescription: "Red patch (erythroplakia)",
    notes: "+22% growth, escalated to urgent referral",
  },
  {
    id: "v5",
    patientId: "p2",
    date: "2026-04-10",
    site: "tongue",
    triageResult: "monitor",
    confidence: 0.65,
    lesionAreaMm2: 12,
    colourDescription: "White patch",
    notes: "Baseline leukoplakia on lateral tongue",
  },
  {
    id: "v6",
    patientId: "p2",
    date: "2026-08-15",
    site: "tongue",
    triageResult: "monitor",
    confidence: 0.63,
    lesionAreaMm2: 12.2,
    colourDescription: "White patch",
    notes: "Stable, minimal change",
  },
  {
    id: "v7",
    patientId: "p3",
    date: "2026-03-01",
    site: "buccal_mucosa_right",
    triageResult: "monitor",
    confidence: 0.7,
    lesionAreaMm2: 14,
    colourDescription: "White patch",
    notes: "Baseline leukoplakia",
  },
  {
    id: "v8",
    patientId: "p3",
    date: "2026-05-20",
    site: "buccal_mucosa_right",
    triageResult: "refer",
    confidence: 0.82,
    lesionAreaMm2: 18,
    colourDescription: "Mixed white and red",
    notes: "Growth and colour shift, referred",
  },
  {
    id: "v9",
    patientId: "p3",
    date: "2026-09-02",
    site: "buccal_mucosa_right",
    triageResult: "benign",
    confidence: 0.91,
    lesionAreaMm2: 0,
    colourDescription: "Post-biopsy healing",
    notes: "Biopsy done, benign result confirmed",
  },
  {
    id: "v10",
    patientId: "p5",
    date: "2026-07-20",
    site: "palate",
    triageResult: "monitor",
    confidence: 0.68,
    lesionAreaMm2: 10,
    colourDescription: "White patch",
    notes: "Baseline, small leukoplakia on hard palate",
  },
];

export const seedReferrals: Referral[] = [
  {
    id: "r1",
    patientId: "p1",
    visitId: "v4",
    referredDate: "2026-09-08",
    hospital: "Govt. Hospital, Chengalpattu",
    department: "Dental OPD",
    availableDays: "Tue and Thu",
    status: "overdue",
    remindersSent: 2,
  },
  {
    id: "r2",
    patientId: "p2",
    visitId: "v6",
    referredDate: "2026-08-15",
    hospital: "PHC Melmaruvathur",
    department: "Dental",
    availableDays: "Mon to Fri",
    status: "referred",
    remindersSent: 0,
  },
  {
    id: "r3",
    patientId: "p3",
    visitId: "v8",
    referredDate: "2026-05-20",
    hospital: "Govt. Hospital, Chengalpattu",
    department: "Dental OPD",
    availableDays: "Tue and Thu",
    status: "closed",
    remindersSent: 1,
  },
];

export const seedCampSession: CampSession = {
  location: "Melmaruvathur",
  date: "2026-09-17",
  queue: [
    { token: 64, patientId: "p4", type: "new" },
    { token: 65, patientId: "p5", type: "recheck" },
    { token: 66, patientId: "", type: "new" },
  ],
  screenedCount: 63,
  avgTimeSeconds: 94,
  isOffline: true,
};

export const seedSyncState: SyncState = {
  visitsQueued: 63,
  imagesPending: 241,
  queueSizeMb: 38,
  lastSync: "2026-09-15",
  modelVersion: "v1.3",
};
```

- [ ] **Step 7: Create Zustand store**

Create `store/useStore.ts`:

```ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Patient,
  Visit,
  Referral,
  CampSession,
  SyncState,
} from "@/lib/types";
import {
  seedPatients,
  seedVisits,
  seedReferrals,
  seedCampSession,
  seedSyncState,
} from "@/data/seed";

interface MedVisionStore {
  patients: Patient[];
  visits: Visit[];
  referrals: Referral[];
  campSession: CampSession;
  syncState: SyncState;

  addPatient: (patient: Patient) => void;
  addVisit: (visit: Visit) => void;
  updateReferralStatus: (id: string, status: Referral["status"]) => void;
  advanceCampQueue: () => void;
  simulateSync: () => void;
  resetToSeed: () => void;

  getPatient: (id: string) => Patient | undefined;
  getVisitsForPatient: (patientId: string) => Visit[];
  getReferralsForPatient: (patientId: string) => Referral[];
}

export const useStore = create<MedVisionStore>()(
  persist(
    (set, get) => ({
      patients: seedPatients,
      visits: seedVisits,
      referrals: seedReferrals,
      campSession: seedCampSession,
      syncState: seedSyncState,

      addPatient: (patient) =>
        set((state) => ({ patients: [...state.patients, patient] })),

      addVisit: (visit) =>
        set((state) => ({ visits: [...state.visits, visit] })),

      updateReferralStatus: (id, status) =>
        set((state) => ({
          referrals: state.referrals.map((r) =>
            r.id === id ? { ...r, status } : r
          ),
        })),

      advanceCampQueue: () =>
        set((state) => ({
          campSession: {
            ...state.campSession,
            queue: state.campSession.queue.slice(1),
            screenedCount: state.campSession.screenedCount + 1,
          },
        })),

      simulateSync: () =>
        set({
          syncState: {
            visitsQueued: 0,
            imagesPending: 0,
            queueSizeMb: 0,
            lastSync: new Date().toISOString().split("T")[0],
            modelVersion: "v1.3",
          },
        }),

      resetToSeed: () =>
        set({
          patients: seedPatients,
          visits: seedVisits,
          referrals: seedReferrals,
          campSession: seedCampSession,
          syncState: seedSyncState,
        }),

      getPatient: (id) => get().patients.find((p) => p.id === id),

      getVisitsForPatient: (patientId) =>
        get()
          .visits.filter((v) => v.patientId === patientId)
          .sort((a, b) => a.date.localeCompare(b.date)),

      getReferralsForPatient: (patientId) =>
        get().referrals.filter((r) => r.patientId === patientId),
    }),
    {
      name: "medvision-store",
    }
  )
);
```

- [ ] **Step 8: Create utility functions**

Create `lib/utils.ts`:

```ts
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getRiskLabel(score: number): string {
  if (score >= 7) return "High";
  if (score >= 4) return "Moderate";
  return "Low";
}

export function getRiskColor(score: number): string {
  if (score >= 7) return "#E63946";
  if (score >= 4) return "#F59E0B";
  return "#16A34A";
}

export function getTriageColor(result: string): string {
  switch (result) {
    case "refer":
      return "#E63946";
    case "monitor":
      return "#F59E0B";
    case "benign":
      return "#16A34A";
    default:
      return "#6B7280";
  }
}

export function getTriageLabel(result: string): string {
  switch (result) {
    case "refer":
      return "Refer urgently";
    case "monitor":
      return "Monitor";
    case "benign":
      return "Benign";
    default:
      return result;
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "overdue":
      return "#E63946";
    case "referred":
    case "monitor":
    case "active":
      return "#F59E0B";
    case "closed":
    case "reached":
    case "biopsied":
    case "benign":
      return "#16A34A";
    default:
      return "#6B7280";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "overdue":
      return "Overdue";
    case "referred":
      return "Referred";
    case "reached":
      return "Reached";
    case "biopsied":
      return "Biopsied";
    case "closed":
      return "Closed";
    case "active":
      return "Active";
    case "monitor":
      return "Monitor";
    default:
      return status;
  }
}

export function calculateGrowthPercent(
  oldArea: number,
  newArea: number
): number {
  if (oldArea === 0) return 0;
  return Math.round(((newArea - oldArea) / oldArea) * 1000) / 10;
}

export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1 + "T00:00:00");
  const d2 = new Date(date2 + "T00:00:00");
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export function weeksLabel(days: number): string {
  const weeks = Math.round(days / 7);
  return `${weeks} week${weeks !== 1 ? "s" : ""}`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function calculateHabitRisk(
  types: string[],
  durationYears: number,
  alcoholUse: boolean,
  mouthOpening: number
): number {
  let score = 0;
  score += types.length * 1.2;
  score += Math.min(durationYears / 5, 3);
  if (alcoholUse) score += 1.5;
  if (mouthOpening < 35) score += 1;
  if (mouthOpening < 30) score += 1;
  return Math.min(Math.round(score * 10) / 10, 10);
}
```

- [ ] **Step 9: Verify setup compiles**

```bash
cd D:\MedVision && npm run dev
```

Open `http://localhost:3000` — should show the default Next.js page. Stop the server.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold project with data layer, store, and utilities"
```

---

### Task 2: App Shell & Navigation

**Files:**
- Create: `components/PhoneFrame.tsx`
- Create: `components/BottomNav.tsx`
- Create: `components/TopBar.tsx`
- Create: `components/PageTransition.tsx`
- Modify: `app/layout.tsx`
- Create: `app/page.tsx` (redirect)

**Interfaces:**
- Consumes: Tailwind config colors, Inter font
- Produces: `PhoneFrame` wrapper, `BottomNav` with 4 tabs, `TopBar` with back/title/offline, `PageTransition` motion wrapper

- [ ] **Step 1: Create PhoneFrame component**

Create `components/PhoneFrame.tsx`:

```tsx
"use client";

import { ReactNode } from "react";

export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      {/* Glow behind phone */}
      <div className="absolute w-[300px] h-[500px] bg-primary/20 rounded-full blur-[100px]" />

      {/* Phone body */}
      <div className="relative w-[375px] h-[812px] bg-warm-white rounded-[40px] overflow-hidden shadow-2xl border-[3px] border-neutral-800 flex flex-col">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-dark rounded-b-2xl z-50" />

        {/* Status bar */}
        <div className="h-[48px] bg-transparent shrink-0" />

        {/* Content area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {children}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create BottomNav component**

Create `components/BottomNav.tsx`:

```tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Camera, Users, Settings } from "lucide-react";

const tabs = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/capture", icon: Camera, label: "Capture" },
  { href: "/patients", icon: Users, label: "Patients" },
  { href: "/sync", icon: Settings, label: "Settings" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="shrink-0 bg-white border-t border-neutral-100 px-2 pb-2 pt-1">
      <div className="flex justify-around">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                isActive ? "text-primary" : "text-muted"
              }`}
            >
              <tab.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span
                className={`text-[10px] tracking-wide ${
                  isActive ? "font-semibold" : "font-medium"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Create TopBar component**

Create `components/TopBar.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, WifiOff, Wifi } from "lucide-react";

interface TopBarProps {
  title: string;
  showBack?: boolean;
  showOffline?: boolean;
  transparent?: boolean;
  light?: boolean;
}

export default function TopBar({
  title,
  showBack = false,
  showOffline = false,
  transparent = false,
  light = false,
}: TopBarProps) {
  const router = useRouter();
  const textColor = light ? "text-white" : "text-dark";

  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 ${
        transparent ? "" : "bg-warm-white"
      }`}
    >
      {showBack && (
        <button
          onClick={() => router.back()}
          className={`p-1 -ml-1 ${textColor}`}
        >
          <ChevronLeft size={24} />
        </button>
      )}
      <h1 className={`text-lg font-bold flex-1 ${textColor}`}>{title}</h1>
      {showOffline && (
        <div className="flex items-center gap-1.5 bg-danger/10 text-danger px-2.5 py-1 rounded-pill text-xs font-semibold">
          <WifiOff size={12} />
          Offline
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create PageTransition wrapper**

Create `components/PageTransition.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 5: Update root layout**

Replace `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PhoneFrame from "@/components/PhoneFrame";
import BottomNav from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MedVision",
  description: "Oral lesion surveillance for frontline health workers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <PhoneFrame>
          {children}
          <BottomNav />
        </PhoneFrame>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Create root page redirect**

Replace `app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

- [ ] **Step 7: Create a placeholder dashboard page to verify shell**

Create `app/dashboard/page.tsx`:

```tsx
"use client";

import PageTransition from "@/components/PageTransition";

export default function DashboardPage() {
  return (
    <PageTransition>
      <div className="p-4">
        <h1 className="text-2xl font-bold text-dark">Dashboard</h1>
        <p className="text-muted mt-2">Shell is working.</p>
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 8: Run dev server and verify**

```bash
npm run dev
```

Open `http://localhost:3000`. You should see:
- Black background with a phone-shaped frame centered
- Notch at top
- "Dashboard" text inside the phone
- Bottom navigation bar with 4 tabs (Home highlighted)

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add app shell with phone frame, bottom nav, and top bar"
```

---

### Task 3: Shared UI Components

**Files:**
- Create: `components/StatusBadge.tsx`
- Create: `components/StatCard.tsx`
- Create: `components/PatientCard.tsx`
- Create: `components/HabitChips.tsx`
- Create: `components/RiskScoreBar.tsx`
- Create: `components/GradCamOverlay.tsx`
- Create: `components/LesionComparison.tsx`
- Create: `components/TimelineEntry.tsx`

**Interfaces:**
- Consumes: Types from `lib/types.ts`, utilities from `lib/utils.ts`
- Produces: All shared UI components consumed by screens in Tasks 4-7

- [ ] **Step 1: Create StatusBadge**

Create `components/StatusBadge.tsx`:

```tsx
"use client";

import { getStatusColor, getStatusLabel } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);
  const padding = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";

  return (
    <span
      className={`inline-block rounded-pill font-semibold ${padding}`}
      style={{ backgroundColor: color, color: "#fff" }}
    >
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Create StatCard with count-up animation**

Create `components/StatCard.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: number;
  color?: string;
}

export default function StatCard({ label, value, color }: StatCardProps) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 800;
    const step = 16;
    const increment = value / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayed(value);
        clearInterval(timer);
      } else {
        setDisplayed(Math.floor(start));
      }
    }, step);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 text-center"
    >
      <p
        className="text-[11px] uppercase tracking-wider font-medium mb-1"
        style={{ color: color || "rgba(255,255,255,0.7)" }}
      >
        {label}
      </p>
      <p className="text-5xl font-black text-white">{displayed}</p>
    </motion.div>
  );
}
```

- [ ] **Step 3: Create PatientCard**

Create `components/PatientCard.tsx`:

```tsx
"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import StatusBadge from "./StatusBadge";

interface PatientCardProps {
  id: string;
  name: string;
  age: number;
  subtitle: string;
  status: string;
}

export default function PatientCard({
  id,
  name,
  age,
  subtitle,
  status,
}: PatientCardProps) {
  return (
    <Link href={`/patients/${id}`}>
      <div className="flex items-center gap-3 bg-white rounded-card p-4 shadow-sm active:scale-[0.98] transition-transform">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
          {name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-dark text-[15px]">
            {name}, {age}
          </p>
          <p className="text-xs text-muted truncate">{subtitle}</p>
        </div>
        <StatusBadge status={status} size="sm" />
        <ChevronRight size={16} className="text-muted" />
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Create HabitChips**

Create `components/HabitChips.tsx`:

```tsx
"use client";

import { TobaccoType } from "@/lib/types";

const HABIT_LABELS: Record<TobaccoType, string> = {
  gutkha: "Gutkha",
  khaini: "Khaini",
  betel_quid: "Betel quid",
  smoking: "Smoking",
};

interface HabitChipsProps {
  selected: TobaccoType[];
  onChange: (selected: TobaccoType[]) => void;
  readonly?: boolean;
}

export default function HabitChips({
  selected,
  onChange,
  readonly = false,
}: HabitChipsProps) {
  const allTypes: TobaccoType[] = ["gutkha", "khaini", "betel_quid", "smoking"];

  function toggle(type: TobaccoType) {
    if (readonly) return;
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allTypes.map((type) => {
        const isActive = selected.includes(type);
        return (
          <button
            key={type}
            onClick={() => toggle(type)}
            className={`px-4 py-2 rounded-pill text-sm font-semibold transition-all ${
              isActive
                ? "bg-danger text-white"
                : "bg-transparent border-2 border-neutral-200 text-dark"
            } ${readonly ? "cursor-default" : "active:scale-95"}`}
          >
            {HABIT_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Create RiskScoreBar**

Create `components/RiskScoreBar.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { getRiskLabel, getRiskColor } from "@/lib/utils";

interface RiskScoreBarProps {
  score: number;
}

export default function RiskScoreBar({ score }: RiskScoreBarProps) {
  const label = getRiskLabel(score);
  const color = getRiskColor(score);
  const percent = (score / 10) * 100;

  return (
    <div className="bg-white rounded-card p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-wider font-medium text-muted mb-1">
        Habit risk score
      </p>
      <p className="text-2xl font-black" style={{ color }}>
        {label} — {score} / 10
      </p>
      <div className="mt-3 h-2 bg-input-bg rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create GradCamOverlay**

Create `components/GradCamOverlay.tsx`:

```tsx
"use client";

interface GradCamOverlayProps {
  size?: number;
  x?: string;
  y?: string;
}

export default function GradCamOverlay({
  size = 80,
  x = "55%",
  y = "45%",
}: GradCamOverlayProps) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        width: size,
        height: size,
      }}
    >
      <div
        className="w-full h-full rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(230,57,70,0.7) 0%, rgba(249,158,11,0.4) 40%, rgba(249,158,11,0.1) 70%, transparent 100%)",
        }}
      />
      <div className="absolute -bottom-5 right-0 bg-dark/70 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
        Grad-CAM
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create LesionComparison**

Create `components/LesionComparison.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";

interface LesionComparisonProps {
  dateOld: string;
  dateNew: string;
  growthPercent: number;
  oldSizePx?: number;
  newSizePx?: number;
}

export default function LesionComparison({
  dateOld,
  dateNew,
  growthPercent,
  oldSizePx = 40,
  newSizePx = 56,
}: LesionComparisonProps) {
  return (
    <div className="flex gap-4">
      {/* Old visit */}
      <div className="flex-1">
        <div className="bg-[#FDE8E8] rounded-2xl h-40 flex items-center justify-center relative overflow-hidden">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="rounded-full bg-[#E6A08C]"
            style={{ width: oldSizePx, height: oldSizePx * 0.7 }}
          />
        </div>
        <p className="text-center text-sm font-semibold text-dark mt-2">
          {dateOld}
        </p>
      </div>

      {/* New visit */}
      <div className="flex-1">
        <div className="bg-[#FDE8E8] rounded-2xl h-40 flex items-center justify-center relative overflow-hidden">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="rounded-full bg-[#C94040]"
            style={{ width: newSizePx, height: newSizePx * 0.7 }}
          />
        </div>
        <p className="text-center text-sm font-semibold text-dark mt-2">
          {dateNew}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Create TimelineEntry**

Create `components/TimelineEntry.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { formatDate, getTriageColor, getTriageLabel } from "@/lib/utils";
import StatusBadge from "./StatusBadge";

interface TimelineEntryProps {
  date: string;
  notes: string;
  triageResult: string;
  isLast?: boolean;
  index?: number;
  onClick?: () => void;
}

export default function TimelineEntry({
  date,
  notes,
  triageResult,
  isLast = false,
  index = 0,
  onClick,
}: TimelineEntryProps) {
  const color = getTriageColor(triageResult);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex gap-3 cursor-pointer active:bg-neutral-50 rounded-xl p-2 -ml-2 transition-colors"
      onClick={onClick}
    >
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div
          className="w-3.5 h-3.5 rounded-full border-[3px] shrink-0"
          style={{ borderColor: color, backgroundColor: `${color}30` }}
        />
        {!isLast && <div className="w-0.5 flex-1 bg-neutral-200 mt-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-dark">{formatDate(date)}</p>
          <StatusBadge status={triageResult} size="sm" />
        </div>
        <p className="text-xs text-muted mt-0.5">{notes}</p>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add shared UI components (badges, cards, chips, overlays)"
```

---

### Task 4: Dashboard & Referral Tracking (Screen 4)

**Files:**
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `useStore()` (patients, referrals, visits), `StatCard`, `PatientCard`, `PageTransition`
- Produces: Screen 4 — the home screen with stats hero and patient follow-up list

- [ ] **Step 1: Build Screen 4**

Replace `app/dashboard/page.tsx`:

```tsx
"use client";

import { useStore } from "@/store/useStore";
import PageTransition from "@/components/PageTransition";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ChevronRight, Volume2, Tent, Stethoscope } from "lucide-react";

export default function DashboardPage() {
  const { patients, referrals, visits } = useStore();

  const screened = visits.length > 0 ? 214 : 0;
  const flagged = referrals.length;
  const reached = referrals.filter(
    (r) => r.status === "reached" || r.status === "biopsied" || r.status === "closed"
  ).length;

  const overdueCount = referrals.filter((r) => r.status === "overdue").length;

  const followUpList = referrals.map((ref) => {
    const patient = patients.find((p) => p.id === ref.patientId);
    return { ...ref, patient };
  });

  return (
    <PageTransition>
      {/* Teal hero */}
      <div className="bg-primary px-5 pt-4 pb-6">
        <h1 className="text-2xl font-bold text-white mb-5">Your follow-ups</h1>
        <div className="flex gap-2">
          <StatCard label="Screened" value={screened} />
          <StatCard label="Flagged" value={flagged} />
          <StatCard label="Reached" value={reached} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 px-4 -mt-3">
        <Link href="/camp" className="flex-1">
          <div className="bg-dark text-white rounded-2xl p-3 flex items-center gap-2 active:scale-95 transition-transform">
            <Tent size={18} />
            <span className="text-xs font-semibold">Camp Mode</span>
          </div>
        </Link>
        <Link href="/review" className="flex-1">
          <div className="bg-danger text-white rounded-2xl p-3 flex items-center gap-2 active:scale-95 transition-transform">
            <Stethoscope size={18} />
            <span className="text-xs font-semibold">Review Queue</span>
          </div>
        </Link>
      </div>

      {/* Follow-up list */}
      <div className="px-4 pt-5 pb-4">
        <div className="space-y-3">
          {followUpList.map((ref, i) => (
            <Link key={ref.id} href={`/patients/${ref.patientId}`}>
              <div className="flex items-center gap-3 bg-white rounded-card p-4 shadow-sm active:scale-[0.98] transition-transform">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {ref.patient?.name.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-dark text-[15px]">
                    {ref.patient?.name}
                  </p>
                  <p className="text-xs text-muted">
                    Referred {formatDate(ref.referredDate)}
                  </p>
                </div>
                <StatusBadge status={ref.status} size="sm" />
              </div>
            </Link>
          ))}
        </div>

        {/* Voice reminders button */}
        {overdueCount > 0 && (
          <button className="w-full mt-4 py-3.5 rounded-pill bg-dark text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <Volume2 size={16} />
            Send voice reminders ({overdueCount})
          </button>
        )}
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 2: Verify visually**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify: teal hero with 3 stat numbers counting up, Camp Mode and Review Queue buttons, patient referral list with status badges, voice reminders button at bottom.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add referral tracking dashboard (Screen 4)"
```

---

### Task 5: Patient Management Screens (List, Intake, Timeline)

**Files:**
- Create: `app/patients/page.tsx` (patient list)
- Create: `app/patients/new/page.tsx` (Screen 5: Patient Intake)
- Create: `app/patients/[id]/page.tsx` (Screen 6: Visit Timeline)

**Interfaces:**
- Consumes: `useStore()`, `PatientCard`, `HabitChips`, `RiskScoreBar`, `TimelineEntry`, `TopBar`, `PageTransition`
- Produces: Screens 5 and 6, plus the patient list landing page

- [ ] **Step 1: Create patient list page**

Create `app/patients/page.tsx`:

```tsx
"use client";

import { useStore } from "@/store/useStore";
import PageTransition from "@/components/PageTransition";
import PatientCard from "@/components/PatientCard";
import TopBar from "@/components/TopBar";
import Link from "next/link";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function PatientsPage() {
  const { patients, visits } = useStore();

  return (
    <PageTransition>
      <TopBar title="Patients" />
      <div className="px-4 pb-4">
        <Link href="/patients/new">
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="w-full py-3.5 rounded-pill bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 mb-4"
          >
            <Plus size={18} />
            New Patient
          </motion.button>
        </Link>

        <div className="space-y-3">
          {patients.map((p, i) => {
            const visitCount = visits.filter(
              (v) => v.patientId === p.id
            ).length;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <PatientCard
                  id={p.id}
                  name={p.name}
                  age={p.age}
                  subtitle={`${visitCount} visit${visitCount !== 1 ? "s" : ""} · ABHA ${p.abhaNumber.slice(-4)}`}
                  status={p.status}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 2: Create Screen 5 — Patient Intake**

Create `app/patients/new/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import PageTransition from "@/components/PageTransition";
import TopBar from "@/components/TopBar";
import HabitChips from "@/components/HabitChips";
import RiskScoreBar from "@/components/RiskScoreBar";
import { TobaccoType } from "@/lib/types";
import { generateId, calculateHabitRisk } from "@/lib/utils";
import { motion } from "framer-motion";

export default function NewPatientPage() {
  const router = useRouter();
  const addPatient = useStore((s) => s.addPatient);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [abha, setAbha] = useState("");
  const [habits, setHabits] = useState<TobaccoType[]>([]);
  const [duration, setDuration] = useState(5);
  const [alcohol, setAlcohol] = useState(false);
  const [mouthOpening, setMouthOpening] = useState(40);

  const riskScore = calculateHabitRisk(habits, duration, alcohol, mouthOpening);

  function handleSubmit() {
    if (!name.trim()) return;
    addPatient({
      id: generateId(),
      name: name.trim(),
      age: parseInt(age) || 30,
      abhaNumber: abha || "91 0000 0000 0000",
      tobaccoHabit: { types: habits, durationYears: duration },
      alcoholUse: alcohol,
      mouthOpening,
      habitRiskScore: riskScore,
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
    });
    router.push("/patients");
  }

  return (
    <PageTransition>
      <TopBar title="New patient" showBack />
      <div className="px-4 pb-6">
        {/* ABHA */}
        <label className="block mb-1 text-[11px] uppercase tracking-wider font-medium text-muted">
          ABHA number
        </label>
        <input
          value={abha}
          onChange={(e) => setAbha(e.target.value)}
          placeholder="91 4402 8871 4412"
          className="w-full bg-input-bg rounded-2xl px-4 py-3.5 text-dark text-sm outline-none mb-4"
        />

        {/* Name & Age */}
        <div className="flex gap-3 mb-4">
          <div className="flex-[2]">
            <label className="block mb-1 text-[11px] uppercase tracking-wider font-medium text-muted">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Patient name"
              className="w-full bg-input-bg rounded-2xl px-4 py-3.5 text-dark text-sm outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block mb-1 text-[11px] uppercase tracking-wider font-medium text-muted">
              Age
            </label>
            <input
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="40"
              type="number"
              className="w-full bg-input-bg rounded-2xl px-4 py-3.5 text-dark text-sm outline-none"
            />
          </div>
        </div>

        {/* Tobacco habit */}
        <label className="block mb-2 text-[11px] uppercase tracking-wider font-medium text-muted">
          Tobacco habit
        </label>
        <HabitChips selected={habits} onChange={setHabits} />

        {/* Duration */}
        <label className="block mt-4 mb-1 text-[11px] uppercase tracking-wider font-medium text-muted">
          Duration
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={40}
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="flex-1 accent-danger"
          />
          <span className="text-sm font-bold text-dark w-16 text-right">
            {duration} years
          </span>
        </div>

        {/* Alcohol */}
        <label className="flex items-center gap-3 mt-4 mb-2">
          <div
            className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${alcohol ? "bg-danger" : "bg-neutral-200"}`}
            onClick={() => setAlcohol(!alcohol)}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${alcohol ? "left-[18px]" : "left-0.5"}`}
            />
          </div>
          <span className="text-sm text-dark font-medium">Alcohol use</span>
        </label>

        {/* Mouth opening */}
        <label className="block mt-4 mb-1 text-[11px] uppercase tracking-wider font-medium text-muted">
          Mouth opening (mm)
        </label>
        <input
          type="number"
          value={mouthOpening}
          onChange={(e) => setMouthOpening(parseInt(e.target.value) || 0)}
          className="w-full bg-input-bg rounded-2xl px-4 py-3.5 text-dark text-sm outline-none mb-4"
        />

        {/* Risk score */}
        <RiskScoreBar score={riskScore} />

        {/* Submit */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleSubmit}
          className="w-full mt-5 py-3.5 rounded-pill bg-primary text-white font-bold text-sm active:bg-primary-dark transition-colors"
        >
          Register Patient
        </motion.button>
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 3: Create Screen 6 — Visit Timeline**

Create `app/patients/[id]/page.tsx`:

```tsx
"use client";

import { useParams } from "next/navigation";
import { useStore } from "@/store/useStore";
import PageTransition from "@/components/PageTransition";
import TimelineEntry from "@/components/TimelineEntry";
import HabitChips from "@/components/HabitChips";
import RiskScoreBar from "@/components/RiskScoreBar";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function PatientTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const patient = useStore((s) => s.getPatient(id));
  const visits = useStore((s) => s.getVisitsForPatient(id));

  if (!patient) {
    return (
      <div className="p-4 text-center text-muted">Patient not found.</div>
    );
  }

  return (
    <PageTransition>
      {/* Teal header */}
      <div className="bg-primary px-4 pt-3 pb-5">
        <button onClick={() => router.back()} className="text-white p-1 -ml-1 mb-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-white">{patient.name}, {patient.age}</h1>
        <p className="text-white/70 text-sm mt-0.5">
          {visits.length} visit{visits.length !== 1 ? "s" : ""} · ABHA {patient.abhaNumber.slice(-4)}
        </p>
      </div>

      <div className="px-4 pt-4 pb-4">
        {/* Habit info */}
        <div className="mb-4">
          <HabitChips
            selected={patient.tobaccoHabit.types}
            onChange={() => {}}
            readonly
          />
          <p className="text-xs text-muted mt-2">
            Duration: {patient.tobaccoHabit.durationYears} years
            {patient.alcoholUse ? " · Alcohol use" : ""}
            {" · "}Mouth opening: {patient.mouthOpening} mm
          </p>
        </div>

        <RiskScoreBar score={patient.habitRiskScore} />

        {/* Timeline */}
        <h2 className="text-lg font-bold text-dark mt-5 mb-3">Visit history</h2>
        <div>
          {visits.map((visit, i) => (
            <TimelineEntry
              key={visit.id}
              date={visit.date}
              notes={visit.notes}
              triageResult={visit.triageResult}
              isLast={i === visits.length - 1}
              index={i}
              onClick={() => {
                if (visits.length >= 2 && i > 0) {
                  router.push(`/patients/${id}/change?v1=${visits[i - 1].id}&v2=${visit.id}`);
                }
              }}
            />
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 4: Verify all 3 screens**

```bash
npm run dev
```

Test flow: Patients tab → see list of 5 patients → tap "New Patient" → fill form, see risk score update → submit → back to list → tap Lakshmi D → see timeline with 4 visits.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add patient list, intake form, and visit timeline (Screens 5, 6)"
```

---

### Task 6: Capture & Triage Flow (Screens 1, 2, 8)

**Files:**
- Create: `app/capture/page.tsx` (Screen 1: Guided Capture)
- Create: `app/triage/page.tsx` (Screen 2: Triage Result)
- Create: `app/result/page.tsx` (Screen 8: Patient-Facing Result)

**Interfaces:**
- Consumes: `useStore()`, `GradCamOverlay`, `PageTransition`, Framer Motion
- Produces: The 3-screen capture flow: Capture → Triage → Patient Result

- [ ] **Step 1: Create Screen 1 — Guided Capture**

Create `app/capture/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ORAL_SITE_LABELS, OralSite } from "@/lib/types";
import PageTransition from "@/components/PageTransition";

const SITES: OralSite[] = [
  "buccal_mucosa_left",
  "buccal_mucosa_right",
  "tongue",
  "palate",
];

export default function CapturePage() {
  const router = useRouter();
  const [currentSite, setCurrentSite] = useState(0);
  const [captured, setCaptured] = useState<boolean[]>([false, false, false, false]);
  const [focusOk, setFocusOk] = useState(true);

  function handleCapture() {
    const next = [...captured];
    next[currentSite] = true;
    setCaptured(next);

    if (currentSite < 3) {
      setCurrentSite(currentSite + 1);
      setFocusOk(Math.random() > 0.3);
    } else {
      router.push("/triage");
    }
  }

  const capturedCount = captured.filter(Boolean).length;
  const progressPercent = (capturedCount / 4) * 100;

  return (
    <PageTransition>
      {/* Dark viewfinder area */}
      <div className="bg-dark relative" style={{ height: 380 }}>
        {/* Site indicator */}
        <div className="absolute top-3 left-0 right-0 px-4 flex items-center justify-between z-10">
          <div>
            <p className="text-white font-bold text-sm">
              Site {currentSite + 1} of 4
            </p>
            <p className="text-white/60 text-xs">
              {ORAL_SITE_LABELS[SITES[currentSite]]}
            </p>
          </div>
        </div>

        {/* Quality badges */}
        <div className="absolute top-3 right-4 flex gap-2 z-10">
          <span
            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
              focusOk
                ? "bg-success/90 text-white"
                : "bg-warning/90 text-dark"
            }`}
          >
            {focusOk ? "Focus ok" : "Move closer"}
          </span>
        </div>

        {/* Simulated viewfinder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[200px] h-[140px] border-2 border-dashed border-white/50 rounded-[50%] flex items-center justify-center">
            <div className="w-[160px] h-[110px] rounded-[50%] bg-[#8B5E5E]/30" />
          </div>
        </div>

        {/* Guide text */}
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <p className="text-white/70 text-xs">
            Align lesion inside the guide
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-warm-white px-4 pt-5 pb-4 flex flex-col items-center">
        {/* Progress ring */}
        <div className="relative w-20 h-20 mb-4">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="35"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="4"
            />
            <motion.circle
              cx="40"
              cy="40"
              r="35"
              fill="none"
              stroke="#0C8C8C"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={220}
              animate={{ strokeDashoffset: 220 - (220 * progressPercent) / 100 }}
              transition={{ duration: 0.4 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-dark">
              {capturedCount}/4
            </span>
          </div>
        </div>

        {/* Capture button */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleCapture}
          className="w-full py-4 rounded-pill bg-dark text-white font-bold text-base"
        >
          {currentSite < 3 ? "Capture" : "Capture & Analyse"}
        </motion.button>

        <p className="text-xs text-muted mt-3">
          Capture · 4 sites · 90 seconds
        </p>
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 2: Create Screen 2 — Triage Result**

Create `app/triage/page.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import GradCamOverlay from "@/components/GradCamOverlay";
import { useStore } from "@/store/useStore";

export default function TriagePage() {
  const router = useRouter();
  const patients = useStore((s) => s.patients);
  const latestReferred = patients.find((p) => p.status === "referred");
  const patient = latestReferred || patients[0];

  const result = "refer" as const;
  const confidence = 0.87;
  const pattern = "Erythroplakia pattern";

  const bgColor =
    result === "refer"
      ? "#E63946"
      : result === "monitor"
        ? "#F59E0B"
        : "#16A34A";

  const label =
    result === "refer"
      ? "Refer urgently"
      : result === "monitor"
        ? "Monitor"
        : "Benign";

  return (
    <PageTransition>
      {/* Colored hero with image */}
      <div style={{ backgroundColor: bgColor }} className="relative pb-4">
        <div className="px-4 pt-3">
          <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">
            Screening result
          </p>
        </div>
        <div className="mx-4 mt-3 bg-[#FDE8E8] rounded-2xl h-44 relative overflow-hidden flex items-center justify-center">
          <div className="w-24 h-16 rounded-full bg-[#C9A08C]" />
          <GradCamOverlay size={90} x="55%" y="48%" />
        </div>
      </div>

      {/* Result details */}
      <div className="px-4 pt-4 pb-4 bg-warm-white">
        {/* Verdict banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 mb-4"
          style={{ backgroundColor: `${bgColor}15` }}
        >
          <p className="text-2xl font-black" style={{ color: bgColor }}>
            {label}
          </p>
          <p className="text-sm text-muted mt-0.5">
            {pattern} · confidence {confidence}
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted">Image score</span>
            <span className="text-sm font-bold text-dark">High</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted">Habit risk</span>
            <span className="text-sm font-bold text-dark">
              {patient?.tobaccoHabit.types
                .map((t) => t.charAt(0).toUpperCase() + t.slice(1).replace("_", " "))
                .join(", ")}
              , {patient?.tobaccoHabit.durationYears} yrs
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted">Mouth opening</span>
            <span className="text-sm font-bold text-dark">
              {patient?.mouthOpening} mm
            </span>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-muted text-center mt-5 border-t border-neutral-100 pt-3">
          Triage support only. Not a diagnosis.
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push("/result")}
            className="flex-1 py-3.5 rounded-pill text-white font-bold text-sm"
            style={{ backgroundColor: bgColor }}
          >
            Show Patient
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push("/dashboard")}
            className="flex-1 py-3.5 rounded-pill bg-dark text-white font-bold text-sm"
          >
            Done
          </motion.button>
        </div>
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 3: Create Screen 8 — Patient-Facing Result**

Create `app/result/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { MapPin, Bell, Volume2 } from "lucide-react";

export default function ResultPage() {
  const router = useRouter();
  const [playing, setPlaying] = useState(false);

  function handlePlay() {
    setPlaying(true);
    setTimeout(() => setPlaying(false), 3000);
  }

  return (
    <PageTransition>
      {/* Red hero */}
      <div className="bg-danger px-5 pt-8 pb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">
            Your result
          </p>
          <span className="text-white/60 text-xs">Tamil</span>
        </div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-black text-white leading-tight"
        >
          See a doctor within 7 days
        </motion.h1>
        <p className="text-white/70 text-sm mt-2">
          Delivered as audio in the local language
        </p>
      </div>

      {/* Content */}
      <div className="px-4 pt-5 pb-4 bg-warm-white">
        {/* Play button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handlePlay}
          className="w-full py-3.5 rounded-pill border-2 border-dark text-dark font-semibold text-sm flex items-center justify-center gap-2 mb-5"
        >
          <Volume2 size={16} className={playing ? "animate-pulse text-primary" : ""} />
          {playing ? "Playing..." : "Play spoken explanation"}
        </motion.button>

        {/* Audio wave animation */}
        {playing && (
          <div className="flex items-center justify-center gap-1 mb-5 h-8">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-primary rounded-full"
                animate={{
                  height: [8, Math.random() * 24 + 8, 8],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.05,
                }}
              />
            ))}
          </div>
        )}

        {/* Referral info */}
        <div className="bg-white rounded-card p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider font-medium text-muted mb-1">
            Referred to
          </p>
          <p className="text-lg font-bold text-dark">
            Govt. Hospital, Chengalpattu
          </p>
          <p className="text-sm text-muted">Dental OPD · Tue and Thu</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="flex-1 py-3.5 rounded-pill border-2 border-dark text-dark font-semibold text-sm flex items-center justify-center gap-2"
          >
            <MapPin size={16} />
            Directions
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="flex-1 py-3.5 rounded-pill border-2 border-dark text-dark font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Bell size={16} />
            Remind me
          </motion.button>
        </div>

        {/* Back to dashboard */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push("/dashboard")}
          className="w-full mt-4 py-3.5 rounded-pill bg-dark text-white font-bold text-sm"
        >
          Done
        </motion.button>
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 4: Verify the capture flow**

```bash
npm run dev
```

Test: Capture tab → see dark viewfinder with oval guide → tap Capture 4 times, watch progress ring fill → lands on Triage Result with Grad-CAM heatmap → tap "Show Patient" → see patient result with play button, audio wave animation, referral info.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add guided capture, triage result, and patient result (Screens 1, 2, 8)"
```

---

### Task 7: Change Detection, Camp, Sync, Specialist Review (Screens 3, 7, 9, 10)

**Files:**
- Create: `app/patients/[id]/change/page.tsx` (Screen 3: Change Detection)
- Create: `app/camp/page.tsx` (Screen 7: Camp Mode Queue)
- Create: `app/sync/page.tsx` (Screen 9: Offline Sync + Settings)
- Create: `app/review/page.tsx` (Screen 10: Specialist Review)

**Interfaces:**
- Consumes: `useStore()`, `LesionComparison`, `StatusBadge`, `StatCard`, `PageTransition`, all utilities
- Produces: The remaining 4 screens, completing the prototype

- [ ] **Step 1: Create Screen 3 — Change Detection (Core Demo)**

Create `app/patients/[id]/change/page.tsx`:

```tsx
"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useStore } from "@/store/useStore";
import PageTransition from "@/components/PageTransition";
import LesionComparison from "@/components/LesionComparison";
import TopBar from "@/components/TopBar";
import { motion } from "framer-motion";
import {
  formatDate,
  calculateGrowthPercent,
  daysBetween,
  weeksLabel,
} from "@/lib/utils";

export default function ChangeDetectionPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const patient = useStore((s) => s.getPatient(id));
  const allVisits = useStore((s) => s.getVisitsForPatient(id));

  const v1Id = searchParams.get("v1");
  const v2Id = searchParams.get("v2");

  const visit1 = allVisits.find((v) => v.id === v1Id) || allVisits[allVisits.length - 2];
  const visit2 = allVisits.find((v) => v.id === v2Id) || allVisits[allVisits.length - 1];

  if (!patient || !visit1 || !visit2) {
    return <div className="p-4 text-muted">Insufficient visit data.</div>;
  }

  const growth = calculateGrowthPercent(visit1.lesionAreaMm2, visit2.lesionAreaMm2);
  const days = daysBetween(visit1.date, visit2.date);
  const isUrgent = growth > 15;

  return (
    <PageTransition>
      {/* Teal header */}
      <div className="bg-primary px-4 pt-3 pb-5">
        <TopBar
          title={`${patient.name}, ${patient.age}`}
          showBack
          transparent
          light
        />
        <p className="text-white/70 text-sm -mt-1 pl-1">
          ABHA {patient.abhaNumber}
        </p>
      </div>

      <div className="px-4 pt-4 pb-4 bg-warm-white">
        {/* Side-by-side comparison */}
        <LesionComparison
          dateOld={formatDate(visit1.date)}
          dateNew={formatDate(visit2.date)}
          growthPercent={growth}
          oldSizePx={40}
          newSizePx={Math.round(40 * (1 + growth / 100))}
        />

        {/* Alert banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className={`mt-4 rounded-2xl p-4 ${
            isUrgent ? "bg-danger/10" : "bg-warning/10"
          }`}
        >
          <p
            className="text-xl font-black"
            style={{ color: isUrgent ? "#E63946" : "#F59E0B" }}
          >
            Lesion grew {growth}%
          </p>
          <p className="text-sm text-muted mt-0.5">
            {isUrgent
              ? "Escalated to urgent referral"
              : "Continue monitoring"}
          </p>
        </motion.div>

        {/* Stats */}
        <div className="mt-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted">Area change</span>
            <span className="text-sm font-bold text-dark">+{growth}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted">Colour shift</span>
            <span className="text-sm font-bold text-dark">
              {visit1.colourDescription} → {visit2.colourDescription}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted">Interval</span>
            <span className="text-sm font-bold text-dark">
              {weeksLabel(days)}
            </span>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 2: Create Screen 7 — Camp Mode Queue**

Create `app/camp/page.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import PageTransition from "@/components/PageTransition";
import TopBar from "@/components/TopBar";
import { motion } from "framer-motion";

export default function CampPage() {
  const router = useRouter();
  const { campSession, patients, advanceCampQueue } = useStore();

  function handleStartScreening() {
    advanceCampQueue();
    router.push("/capture");
  }

  return (
    <PageTransition>
      {/* Black header */}
      <div className="bg-dark px-4 pt-3 pb-5">
        <div className="flex items-center justify-between mb-4">
          <TopBar
            title={`Camp — ${campSession.location}`}
            showBack
            transparent
            light
          />
        </div>
        <div className="flex items-center justify-between px-1">
          <span className="bg-danger/90 text-white text-[10px] font-bold px-2 py-1 rounded-pill">
            {campSession.isOffline ? "Offline" : "Online"}
          </span>
        </div>
        <div className="flex gap-4 mt-4">
          <div className="flex-1 text-center">
            <p className="text-[11px] uppercase tracking-wider font-medium text-white/60">
              Screened today
            </p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-black text-white mt-1"
            >
              {campSession.screenedCount}
            </motion.p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-[11px] uppercase tracking-wider font-medium text-white/60">
              Avg time
            </p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl font-black text-white mt-1"
            >
              {campSession.avgTimeSeconds}
              <span className="text-lg font-bold text-white/60 ml-1">s</span>
            </motion.p>
          </div>
        </div>
      </div>

      {/* Queue */}
      <div className="px-4 pt-4 pb-4 bg-warm-white">
        <p className="text-[11px] uppercase tracking-wider font-medium text-muted mb-3">
          Waiting
        </p>
        <div className="space-y-2">
          {campSession.queue.map((item, i) => {
            const patient = patients.find((p) => p.id === item.patientId);
            return (
              <motion.div
                key={item.token}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between bg-white rounded-card p-4 shadow-sm"
              >
                <div>
                  <p className="font-semibold text-dark text-sm">
                    Token {item.token} — {patient?.name || `Patient ${item.token}`}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-pill ${
                    item.type === "recheck"
                      ? "bg-warning text-white"
                      : "bg-neutral-100 text-dark"
                  }`}
                >
                  {item.type === "recheck" ? "Recheck" : "New"}
                </span>
              </motion.div>
            );
          })}
        </div>

        {campSession.queue.length > 0 ? (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleStartScreening}
            className="w-full mt-5 py-3.5 rounded-pill bg-primary text-white font-bold text-sm"
          >
            Start next screening
          </motion.button>
        ) : (
          <p className="text-center text-muted text-sm mt-5">
            Queue empty. All patients screened.
          </p>
        )}
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 3: Create Screen 9 — Offline Sync (+ Settings)**

Create `app/sync/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import PageTransition from "@/components/PageTransition";
import TopBar from "@/components/TopBar";
import { motion } from "framer-motion";
import { WifiOff, RefreshCw, RotateCcw } from "lucide-react";

export default function SyncPage() {
  const { syncState, simulateSync, resetToSeed } = useStore();
  const [syncing, setSyncing] = useState(false);

  function handleSync() {
    setSyncing(true);
    setTimeout(() => {
      simulateSync();
      setSyncing(false);
    }, 2000);
  }

  const isFullySynced =
    syncState.visitsQueued === 0 && syncState.imagesPending === 0;

  return (
    <PageTransition>
      <TopBar title="Settings" />
      <div className="px-4 pb-4">
        {/* Sync section */}
        <h2 className="text-xl font-bold text-dark mb-3">Sync</h2>

        {/* Connection banner */}
        <div
          className={`rounded-2xl p-4 mb-4 ${
            isFullySynced ? "bg-success/10" : "bg-warning/10"
          }`}
        >
          <div className="flex items-center gap-2">
            <WifiOff
              size={16}
              className={isFullySynced ? "text-success" : "text-warning"}
            />
            <p
              className="font-bold text-sm"
              style={{ color: isFullySynced ? "#16A34A" : "#F59E0B" }}
            >
              {isFullySynced ? "All synced" : "No connection"}
            </p>
          </div>
          <p className="text-xs text-muted mt-1">
            All screening works offline
          </p>
        </div>

        {/* Stats */}
        <div className="space-y-3 mb-5">
          {[
            { label: "Visits queued", value: syncState.visitsQueued },
            { label: "Images pending", value: syncState.imagesPending },
            {
              label: "Queue size",
              value: `${syncState.queueSizeMb} MB`,
            },
            { label: "Last sync", value: syncState.lastSync },
            {
              label: "Model version",
              value: `${syncState.modelVersion} on device`,
            },
          ].map((stat) => (
            <div key={stat.label} className="flex justify-between items-center">
              <span className="text-sm text-muted">{stat.label}</span>
              <motion.span
                key={String(stat.value)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm font-bold text-dark"
              >
                {stat.value}
              </motion.span>
            </div>
          ))}
        </div>

        {/* Sync button */}
        {!isFullySynced && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleSync}
            disabled={syncing}
            className="w-full py-3.5 rounded-pill bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={syncing ? "animate-spin" : ""}
            />
            {syncing ? "Syncing..." : "Simulate Sync"}
          </motion.button>
        )}

        <p className="text-[11px] text-muted text-center mt-3">
          Uploads resume automatically when a network is found.
        </p>

        {/* Reset demo data */}
        <div className="mt-8 border-t border-neutral-100 pt-5">
          <h2 className="text-xl font-bold text-dark mb-3">Demo</h2>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={resetToSeed}
            className="w-full py-3.5 rounded-pill border-2 border-danger text-danger font-bold text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            Reset Demo Data
          </motion.button>
          <p className="text-[11px] text-muted text-center mt-2">
            Restores all patients, visits, and referrals to initial state.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 4: Create Screen 10 — Specialist Review**

Create `app/review/page.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import PageTransition from "@/components/PageTransition";
import TopBar from "@/components/TopBar";
import GradCamOverlay from "@/components/GradCamOverlay";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import { Phone, RotateCcw } from "lucide-react";

export default function ReviewPage() {
  const router = useRouter();
  const { patients, visits, referrals } = useStore();

  const urgentReferrals = referrals.filter(
    (r) => r.status === "overdue" || r.status === "referred"
  );

  const reviewCase = urgentReferrals[0];
  const patient = patients.find((p) => p.id === reviewCase?.patientId);
  const visit = visits.find((v) => v.id === reviewCase?.visitId);
  const patientVisits = visits.filter(
    (v) => v.patientId === reviewCase?.patientId
  );
  const prevVisit = patientVisits[patientVisits.length - 2];

  if (!reviewCase || !patient || !visit) {
    return (
      <PageTransition>
        <TopBar title="Review queue" showBack />
        <div className="p-4 text-center text-muted">
          No urgent cases to review.
        </div>
      </PageTransition>
    );
  }

  const growth =
    prevVisit && prevVisit.lesionAreaMm2 > 0
      ? Math.round(
          ((visit.lesionAreaMm2 - prevVisit.lesionAreaMm2) /
            prevVisit.lesionAreaMm2) *
            1000
        ) / 10
      : 0;
  const interval = prevVisit
    ? Math.round(
        (new Date(visit.date).getTime() - new Date(prevVisit.date).getTime()) /
          (1000 * 60 * 60 * 24 * 7)
      )
    : 0;

  return (
    <PageTransition>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3">
        <TopBar title="Review queue" showBack />
        <span className="bg-danger text-white text-[10px] font-bold px-2.5 py-1 rounded-pill">
          {urgentReferrals.length} urgent
        </span>
      </div>

      {/* Dark image area */}
      <div className="mx-4 mt-3 bg-[#FDE8E8] rounded-2xl h-44 relative overflow-hidden flex items-center justify-center">
        <div className="w-20 h-14 rounded-full bg-[#C94040]" />
        <GradCamOverlay size={85} x="55%" y="45%" />
        <div className="absolute bottom-2 left-3 bg-dark/70 text-white text-[10px] px-2 py-1 rounded-lg font-medium">
          Site 2 · {formatDate(visit.date)}
        </div>
      </div>

      {/* Patient info */}
      <div className="px-4 pt-4 pb-4">
        <h2 className="text-lg font-bold text-dark">
          {patient.name}, {patient.age} · {reviewCase.hospital.split(",")[1]?.trim() || "Local"}
        </h2>
        <p className="text-xs text-muted">
          Flagged by ASHA Kavitha R
        </p>

        {/* Stats */}
        <div className="mt-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted">Model tier</span>
            <span className="text-sm font-bold text-danger">Refer urgently</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted">Growth</span>
            <span className="text-sm font-bold text-dark">
              +{growth}% in {interval} wk
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted">Habit risk</span>
            <span className="text-sm font-bold text-dark">
              {patient.habitRiskScore} / 10
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-5">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push("/dashboard")}
            className="flex-1 py-3.5 rounded-pill bg-danger text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <Phone size={16} />
            Call for biopsy
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push("/dashboard")}
            className="flex-1 py-3.5 rounded-pill border-2 border-dark text-dark font-bold text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            Recheck 4 wk
          </motion.button>
        </div>
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 5: Verify all remaining screens**

```bash
npm run dev
```

Test each screen:
- **Screen 3:** Patients → Lakshmi D → tap 2nd+ visit → see change detection with growth %, colour shift, interval
- **Screen 7:** Dashboard → Camp Mode → see queue with tokens → Start next screening
- **Screen 9:** Settings tab → see sync stats → tap Simulate Sync → watch counters animate to 0 → Reset Demo Data
- **Screen 10:** Dashboard → Review Queue → see lesion image, patient stats, Call for biopsy / Recheck buttons

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add change detection, camp mode, sync, and specialist review (Screens 3, 7, 9, 10)"
```

- [ ] **Step 7: Final visual walkthrough**

Do one full end-to-end walkthrough:
1. App loads → Dashboard with stats and patient list
2. Tap Camp Mode → see queue → Start screening
3. Capture 4 sites → Triage result with Grad-CAM → Show Patient result → Done
4. Patients tab → list of all patients → tap Lakshmi D → timeline → tap a visit → change detection
5. New Patient → fill form → see risk score → register
6. Settings → sync status → simulate sync → reset demo
7. Dashboard → Review Queue → call for biopsy

If any screen has issues, fix before final commit.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "chore: final polish and visual fixes"
```
