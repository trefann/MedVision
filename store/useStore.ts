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
import { nextStatus, isOpen } from "@/lib/referral";
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
  addReferral: (referral: Referral) => void;
  advanceReferral: (id: string) => void;
  sendReminders: (ids: string[]) => void;
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

      addReferral: (referral) =>
        set((state) => {
          if (state.referrals.some((r) => r.patientId === referral.patientId && isOpen(r))) return state;
          return {
            referrals: [...state.referrals, referral],
            patients: state.patients.map((p) =>
              p.id === referral.patientId ? { ...p, status: "referred" } : p
            ),
          };
        }),

      advanceReferral: (id) =>
        set((state) => {
          const ref = state.referrals.find((r) => r.id === id);
          const next = ref && nextStatus(ref.status);
          if (!ref || !next) return state;
          return {
            referrals: state.referrals.map((r) => (r.id === id ? { ...r, status: next } : r)),
            patients:
              next === "closed"
                ? state.patients.map((p) => (p.id === ref.patientId ? { ...p, status: "closed" } : p))
                : state.patients,
          };
        }),

      sendReminders: (ids) =>
        set((state) => ({
          referrals: state.referrals.map((r) =>
            ids.includes(r.id) ? { ...r, remindersSent: r.remindersSent + 1 } : r
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
