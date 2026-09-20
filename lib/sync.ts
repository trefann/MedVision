import { useStore } from "@/store/useStore";
import type { Patient, Referral, Visit } from "@/lib/types";
import type { SyncPayload } from "@/lib/serverSync";

interface Snapshotable {
  patients: Patient[];
  visits: Visit[];
  referrals: Referral[];
}

export function recordHashes(s: Snapshotable): Record<string, string> {
  const out: Record<string, string> = {};
  s.patients.forEach((p) => (out[`p:${p.id}`] = JSON.stringify([p.age, p.status, p.habitRiskScore, p.tobaccoHabit, p.alcoholUse, p.mouthOpening])));
  s.visits.forEach((v) => (out[`v:${v.id}`] = JSON.stringify([v.date, v.site, v.triageResult, v.confidence])));
  s.referrals.forEach((r) => (out[`r:${r.id}`] = JSON.stringify([r.status, r.referredDate, r.remindersSent])));
  return out;
}

export function pendingCounts(s: Snapshotable & { syncedSnapshot: Record<string, string> }) {
  const now = recordHashes(s);
  let patients = 0, visits = 0, referrals = 0;
  for (const [k, h] of Object.entries(now)) {
    if (s.syncedSnapshot[k] === h) continue;
    if (k.startsWith("p:")) patients++;
    else if (k.startsWith("v:")) visits++;
    else referrals++;
  }
  return { patients, visits, referrals, total: patients + visits + referrals };
}

function toPayload(deviceId: string, s: Snapshotable): Omit<SyncPayload, "sentAt"> {
  const pid = (id: string) => `${deviceId.slice(0, 8)}:${id}`;
  return {
    deviceId,
    patients: s.patients.map((p) => ({
      pid: pid(p.id),
      age: p.age,
      habits: p.tobaccoHabit.types,
      durationYears: p.tobaccoHabit.durationYears,
      alcohol: p.alcoholUse,
      mouthOpening: p.mouthOpening,
      riskScore: p.habitRiskScore,
    })),
    visits: s.visits.map((v) => ({ id: v.id, pid: pid(v.patientId), date: v.date, site: v.site, tier: v.triageResult, confidence: v.confidence })),
    referrals: s.referrals.map((r) => ({ id: r.id, pid: pid(r.patientId), status: r.status, referredDate: r.referredDate, remindersSent: r.remindersSent })),
  };
}

export type SyncResult =
  | { ok: true; sent: number; at: string }
  | { ok: false; reason: "offline" | "server"; message: string };

let inFlight = false;

export async function syncNow(): Promise<SyncResult> {
  if (inFlight) return { ok: false, reason: "server", message: "Sync already running" };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: false, reason: "offline", message: "No connection. Records are queued and will upload when you are online." };
  }
  inFlight = true;
  try {
    const state = useStore.getState();
    const deviceId = state.ensureDeviceId();
    const before = pendingCounts(state).total;
    const snapshot = recordHashes(state);
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(deviceId, state)),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return { ok: false, reason: "server", message: data.error ?? `Server error (${res.status})` };
    state.markSynced(snapshot, data.receivedAt);
    return { ok: true, sent: before, at: data.receivedAt };
  } catch {
    return { ok: false, reason: "offline", message: "Could not reach the server. Records stay queued." };
  } finally {
    inFlight = false;
  }
}
