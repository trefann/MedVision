export type TobaccoType = "gutkha" | "khaini" | "betel_quid" | "smoking";

export type TriageResult = "benign" | "monitor" | "refer";

export type PatientStatus = "active" | "referred" | "closed";

export type ReferralStatus =
  | "flagged"
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
