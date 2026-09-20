import { create } from "zustand";
import type { Analysis } from "@/lib/triage";

interface AnalysisState {
  photos: (string | null)[];
  result: Analysis | null;
  setPhoto: (i: number, src: string | null) => void;
  setResult: (r: Analysis | null) => void;
  reset: () => void;
}

export const useAnalysis = create<AnalysisState>((set) => ({
  photos: [null, null, null, null],
  result: null,
  setPhoto: (i, src) => set((s) => ({ photos: s.photos.map((p, k) => (k === i ? src : p)) })),
  setResult: (result) => set({ result }),
  reset: () => set({ photos: [null, null, null, null], result: null }),
}));
