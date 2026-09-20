import type { Referral, ReferralStatus } from "@/lib/types";

export const STAGES = ["Flagged", "Referred", "Reached", "Biopsy"] as const;

export function stageIndex(status: ReferralStatus): number {
  switch (status) {
    case "flagged": return 0;
    case "referred":
    case "overdue": return 1;
    case "reached": return 2;
    case "biopsied": return 3;
    case "closed": return 4;
  }
}

export function nextStatus(status: ReferralStatus): ReferralStatus | null {
  switch (status) {
    case "flagged": return "referred";
    case "referred":
    case "overdue": return "reached";
    case "reached": return "biopsied";
    case "biopsied": return "closed";
    case "closed": return null;
  }
}

export const NEXT_LABEL: Record<ReferralStatus, string> = {
  flagged: "Confirm referral made",
  referred: "Patient reached hospital",
  overdue: "Patient reached hospital",
  reached: "Biopsy done",
  biopsied: "Close case",
  closed: "",
};

export function funnel(referrals: Referral[]) {
  return STAGES.map((label, i) => ({
    label,
    count: referrals.filter((r) => stageIndex(r.status) >= i).length,
  }));
}

export function isOpen(r: Referral) {
  return r.status !== "closed";
}
