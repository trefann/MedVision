import { get, list, put } from "@vercel/blob";
import { stageIndex } from "@/lib/referral";
import type { ReferralStatus } from "@/lib/types";

export interface SyncPatient {
  pid: string;
  age: number;
  habits: string[];
  durationYears: number;
  alcohol: boolean;
  mouthOpening: number;
  riskScore: number;
}
export interface SyncVisit {
  id: string;
  pid: string;
  date: string;
  site: string;
  tier: string;
  confidence: number;
}
export interface SyncReferral {
  id: string;
  pid: string;
  status: ReferralStatus;
  referredDate: string;
  remindersSent: number;
}
export interface SyncPayload {
  deviceId: string;
  sentAt: string;
  patients: SyncPatient[];
  visits: SyncVisit[];
  referrals: SyncReferral[];
}

const PREFIX = "sync/";
const STATUSES: ReferralStatus[] = ["flagged", "referred", "overdue", "reached", "biopsied", "closed"];
export const MAX_BODY_BYTES = 200_000;

export function validate(raw: unknown): SyncPayload | string {
  if (!raw || typeof raw !== "object") return "Body must be a JSON object";
  const b = raw as Record<string, unknown>;
  if (typeof b.deviceId !== "string" || !/^[a-zA-Z0-9-]{8,64}$/.test(b.deviceId)) return "Invalid deviceId";
  if (!Array.isArray(b.patients) || !Array.isArray(b.visits) || !Array.isArray(b.referrals)) return "patients, visits and referrals must be arrays";
  if (b.patients.length > 300 || b.visits.length > 3000 || b.referrals.length > 1000) return "Too many records";
  const str = (v: unknown, max = 80) => typeof v === "string" && v.length <= max;
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);

  const patients: SyncPatient[] = [];
  for (const p of b.patients as Record<string, unknown>[]) {
    if (!p || !str(p.pid) || !num(p.age) || !Array.isArray(p.habits) || !num(p.durationYears) || typeof p.alcohol !== "boolean" || !num(p.mouthOpening) || !num(p.riskScore)) return "Invalid patient record";
    patients.push({ pid: p.pid as string, age: p.age as number, habits: (p.habits as unknown[]).filter((h) => str(h, 20)).slice(0, 6) as string[], durationYears: p.durationYears as number, alcohol: p.alcohol as boolean, mouthOpening: p.mouthOpening as number, riskScore: p.riskScore as number });
  }
  const visits: SyncVisit[] = [];
  for (const v of b.visits as Record<string, unknown>[]) {
    if (!v || !str(v.id) || !str(v.pid) || !str(v.date, 20) || !str(v.site, 40) || !str(v.tier, 10) || !num(v.confidence)) return "Invalid visit record";
    visits.push({ id: v.id as string, pid: v.pid as string, date: v.date as string, site: v.site as string, tier: v.tier as string, confidence: v.confidence as number });
  }
  const referrals: SyncReferral[] = [];
  for (const r of b.referrals as Record<string, unknown>[]) {
    if (!r || !str(r.id) || !str(r.pid) || !STATUSES.includes(r.status as ReferralStatus) || !str(r.referredDate, 20) || !num(r.remindersSent)) return "Invalid referral record";
    referrals.push({ id: r.id as string, pid: r.pid as string, status: r.status as ReferralStatus, referredDate: r.referredDate as string, remindersSent: r.remindersSent as number });
  }
  return { deviceId: b.deviceId, sentAt: new Date().toISOString(), patients, visits, referrals };
}

export async function saveSnapshot(p: SyncPayload) {
  await put(`${PREFIX}${p.deviceId}.json`, JSON.stringify(p), {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

async function readAll(): Promise<SyncPayload[]> {
  const { blobs } = await list({ prefix: PREFIX, limit: 100 });
  const out = await Promise.all(
    blobs.map(async (b) => {
      const res = await get(b.pathname, { access: "private", useCache: false });
      if (!res || res.statusCode !== 200) return null;
      try {
        return JSON.parse(await new Response(res.stream).text()) as SyncPayload;
      } catch {
        return null;
      }
    })
  );
  return out.filter((x): x is SyncPayload => x !== null);
}

export interface District {
  devices: number;
  updatedAt: string;
  totals: { screened: number; flagged: number; referred: number; reached: number; biopsy: number; overdue: number };
  riskFactors: { label: string; pct: number }[];
}

let cache: { at: number; value: District } | null = null;

export async function aggregate(): Promise<District> {
  if (cache && Date.now() - cache.at < 30_000) return cache.value;
  const snaps = await readAll();
  const referrals = snaps.flatMap((s) => s.referrals);
  const at = (k: number) => referrals.filter((r) => stageIndex(r.status) >= k).length;
  const flaggedPids = new Set(referrals.map((r) => `${r.pid}`));
  const flaggedPatients = snaps.flatMap((s) => s.patients).filter((p) => flaggedPids.has(p.pid));
  const share = (test: (p: SyncPayload["patients"][number]) => boolean) =>
    flaggedPatients.length ? Math.round((flaggedPatients.filter(test).length / flaggedPatients.length) * 100) : 0;
  const value: District = {
    devices: snaps.length,
    updatedAt: new Date().toISOString(),
    totals: {
      screened: snaps.reduce((a, s) => a + s.visits.length, 0),
      flagged: referrals.length,
      referred: at(1),
      reached: at(2),
      biopsy: at(3),
      overdue: referrals.filter((r) => r.status === "overdue").length,
    },
    riskFactors: [
      { label: "Gutkha", pct: share((p) => p.habits.includes("gutkha")) },
      { label: "Khaini", pct: share((p) => p.habits.includes("khaini")) },
      { label: "Betel quid", pct: share((p) => p.habits.includes("betel_quid")) },
      { label: "Smoking", pct: share((p) => p.habits.includes("smoking")) },
      { label: "Alcohol", pct: share((p) => p.alcohol) },
    ],
  };
  cache = { at: Date.now(), value };
  return value;
}
