import { create } from "zustand";

interface DemoState {
  active: boolean;
  step: number;
  start: () => void;
  goTo: (n: number) => void;
  exit: () => void;
}

export const useDemo = create<DemoState>((set) => ({
  active: false,
  step: 0,
  start: () => set({ active: true, step: 0 }),
  goTo: (step) => set({ step }),
  exit: () => set({ active: false, step: 0 }),
}));
