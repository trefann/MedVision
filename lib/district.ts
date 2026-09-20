import type { Referral } from "@/lib/types";
import { stageIndex } from "@/lib/referral";

export interface Phc {
  name: string;
  live?: boolean;
  screened: number;
  flagged: number;
  referred: number;
  reached: number;
  biopsy: number;
  overdue: number;
}

export const SIMULATED_PHCS: Phc[] = [
  { name: "Sample PHC A", screened: 312, flagged: 41, referred: 38, reached: 22, biopsy: 14, overdue: 9 },
  { name: "Sample PHC B", screened: 268, flagged: 33, referred: 31, reached: 24, biopsy: 17, overdue: 3 },
  { name: "Sample PHC C", screened: 190, flagged: 22, referred: 20, reached: 9, biopsy: 5, overdue: 8 },
  { name: "Sample PHC D", screened: 241, flagged: 29, referred: 29, reached: 21, biopsy: 15, overdue: 2 },
  { name: "Sample PHC E", screened: 355, flagged: 47, referred: 44, reached: 30, biopsy: 21, overdue: 5 },
];

export const WEEKLY_SCREENED = [148, 162, 171, 158, 190, 204, 219, 231];

export const RISK_FACTORS = [
  { label: "Gutkha", pct: 58 },
  { label: "Khaini", pct: 44 },
  { label: "Betel quid", pct: 39 },
  { label: "Alcohol", pct: 31 },
  { label: "Smoking", pct: 27 },
];

export function livePhc(referrals: Referral[], screened: number): Phc {
  const at = (k: number) => referrals.filter((r) => stageIndex(r.status) >= k).length;
  return {
    name: "Melmaruvathur PHC",
    live: true,
    screened,
    flagged: referrals.length,
    referred: at(1),
    reached: at(2),
    biopsy: at(3),
    overdue: referrals.filter((r) => r.status === "overdue").length,
  };
}

export function totals(phcs: Phc[]) {
  const sum = (k: keyof Omit<Phc, "name" | "live">) => phcs.reduce((a, p) => a + p[k], 0);
  return {
    screened: sum("screened"),
    flagged: sum("flagged"),
    referred: sum("referred"),
    reached: sum("reached"),
    biopsy: sum("biopsy"),
    overdue: sum("overdue"),
  };
}
