import { create } from "zustand";
import type { Analysis } from "@/lib/triage";
import type { Fused } from "@/lib/risk";
import type { Lang } from "@/lib/i18n";

interface AnalysisState {
  photos: (string | null)[];
  result: Analysis | null;
  fused: Fused | null;
  patientId: string | null;
  lang: Lang;
  setLang: (l: Lang) => void;
  setPatientId: (id: string) => void;
  setFused: (f: Fused | null) => void;
  setPhoto: (i: number, src: string | null) => void;
  setResult: (r: Analysis | null) => void;
  reset: () => void;
}

export const useAnalysis = create<AnalysisState>((set) => ({
  photos: [null, null, null, null],
  result: null,
  fused: null,
  patientId: null,
  lang: "en",
  setLang: (lang) => set({ lang }),
  setPatientId: (patientId) => set({ patientId }),
  setFused: (fused) => set({ fused }),
  setPhoto: (i, src) => set((s) => ({ photos: s.photos.map((p, k) => (k === i ? src : p)) })),
  setResult: (result) => set({ result }),
  reset: () => set({ photos: [null, null, null, null], result: null, fused: null }),
}));
