"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useDemo } from "@/store/useDemo";
import { useAnalysis } from "@/store/useAnalysis";
import { useStore } from "@/store/useStore";
import { DEMO_STEPS } from "@/lib/demoSteps";
import { analysePhotos, urlToDataUrl } from "@/lib/triage";
import { fuseRisk } from "@/lib/risk";

export default function DemoGuide() {
  const router = useRouter();
  const { active, step, goTo, exit } = useDemo();
  const [collapsed, setCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!active) return null;
  const s = DEMO_STEPS[step];
  const last = step === DEMO_STEPS.length - 1;

  function go(n: number) {
    goTo(n);
    router.push(DEMO_STEPS[n].route);
  }

  async function runScreening() {
    setBusy(true);
    const a = useAnalysis.getState();
    a.reset();
    a.setPatientId("p4");
    a.setUsedSample(true);
    const srcs = await Promise.all([0, 1, 2, 3].map((i) => urlToDataUrl(`/samples/refer-${i}.jpg`)));
    srcs.forEach((src, i) => a.setPhoto(i, src));
    const result = await analysePhotos(useAnalysis.getState().photos);
    a.setResult(result);
    const habit = useStore.getState().patients.find((p) => p.id === "p4")?.habitRiskScore ?? 0;
    a.setFused(result ? fuseRisk(result.tier, result.probs, habit) : null);
    setBusy(false);
    go(step + 1);
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute bottom-[76px] right-3 z-40 bg-dark text-white text-[11px] font-bold rounded-full px-3 py-2 flex items-center gap-1 shadow-lg"
      >
        Demo {step + 1}/{DEMO_STEPS.length} <ChevronUp size={14} />
      </button>
    );
  }

  return (
    <div className="absolute left-3 right-3 bottom-[76px] z-40 bg-dark text-white rounded-2xl p-4 shadow-2xl">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
          Guided demo · {step + 1} of {DEMO_STEPS.length}
        </p>
        <div className="flex gap-1">
          <button onClick={() => setCollapsed(true)} aria-label="Minimise" className="p-1 text-white/60">
            <ChevronDown size={16} />
          </button>
          <button onClick={exit} aria-label="Exit demo" className="p-1 text-white/60">
            <X size={16} />
          </button>
        </div>
      </div>
      <p className="font-bold text-sm">{s.title}</p>
      <p className="text-xs text-white/80 mt-1 leading-snug">{s.say}</p>
      {s.todo && <p className="text-xs text-warning font-semibold mt-1.5">{s.todo}</p>}
      {s.action === "screening" && (
        <button
          onClick={runScreening}
          disabled={busy}
          className="w-full mt-3 py-2.5 rounded-full bg-primary text-white text-xs font-bold disabled:opacity-60"
        >
          {busy ? "Analysing on device..." : "Run screening for me"}
        </button>
      )}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => go(step - 1)}
          disabled={step === 0}
          className="flex-1 py-2 rounded-full border border-white/30 text-xs font-semibold disabled:opacity-30"
        >
          Back
        </button>
        <button
          onClick={() => (last ? exit() : s.action === "screening" && !useAnalysis.getState().result ? runScreening() : go(step + 1))}
          className="flex-1 py-2 rounded-full bg-white text-dark text-xs font-bold"
        >
          {last ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}
