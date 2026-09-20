"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { downscaleFile, saliencySeed, urlToDataUrl } from "@/lib/triage";
import {
  ChangeResult,
  ESCALATE_GROWTH_PCT,
  cameraShift,
  compareVisits,
  paintLesion,
  imageToCanvas,
} from "@/lib/change";

type Seed = { x: number; y: number };
const CENTRE: Seed = { x: 0.5, y: 0.5 };
const A0 = 0.045;
interface TestRow { name: string; expected: number; measured: number | null; pass: boolean; note?: string }

export default function ComparePage() {
  const router = useRouter();
  const [oldSrc, setOldSrc] = useState<string | null>(null);
  const [newSrc, setNewSrc] = useState<string | null>(null);
  const [seed, setSeed] = useState<Seed | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<ChangeResult | null>(null);
  const [tests, setTests] = useState<TestRow[] | null>(null);
  const oldFile = useRef<HTMLInputElement>(null);
  const newFile = useRef<HTMLInputElement>(null);

  async function pick(file: File | undefined, which: "old" | "new") {
    if (!file) return;
    const src = await downscaleFile(file);
    setResult(null);
    if (which === "old") { setOldSrc(src); setSeed(null); } else setNewSrc(src);
  }

  async function loadDemo(kind: "same" | "grown") {
    setBusy("Preparing demo photos...");
    setResult(null);
    const canvas = await imageToCanvas(await urlToDataUrl("/samples/refer.jpg"));
    const before = paintLesion(canvas, CENTRE, A0);
    const after = paintLesion(canvas, CENTRE, kind === "same" ? A0 : A0 * 1.4);
    const today = cameraShift(await imageToCanvas(after.src), kind === "same"
      ? { rotDeg: 9, zoom: 1.25, brightness: 0.85 }
      : { rotDeg: -7, zoom: 1.15, brightness: 1 });
    setOldSrc(before.src); setNewSrc(today); setSeed(CENTRE); setBusy(null);
  }

  async function run() {
    if (!oldSrc || !newSrc) return;
    setBusy("Aligning and measuring on device...");
    try {
      const s = seed ?? (await saliencySeed(oldSrc));
      setSeed(s);
      setResult(await compareVisits(oldSrc, newSrc, s));
    } catch (e) {
      setResult({ ok: false, reason: String(e), growthPct: 0, deltaE: 0, areaOld: 0, areaNew: 0, inliers: 0, matches: 0, scale: 1, warnings: [], thr: 0, areaFrac: 0, oldOverlay: "", newOverlay: "" });
    }
    setBusy(null);
  }

  async function selfTest() {
    setBusy("Running validation...");
    setTests(null);
    const rows: TestRow[] = [];
    for (const name of ["refer", "monitor"]) {
      const canvas = await imageToCanvas(await urlToDataUrl(`/samples/${name}.jpg`));
      const before = paintLesion(canvas, CENTRE, A0);
      const cases = [
        { label: "same lesion, camera moved (rotate 10°, zoom x1.3)", f: 1, cam: { rotDeg: 10, zoom: 1.3, brightness: 1 } },
        { label: "same lesion, dim light (rotate -8°, zoom x0.9)", f: 1, cam: { rotDeg: -8, zoom: 0.9, brightness: 0.7 } },
        { label: "lesion +30% (rotate 7°)", f: 1.3, cam: { rotDeg: 7, zoom: 1, brightness: 1 } },
        { label: "lesion +60% (zoom x1.2)", f: 1.6, cam: { rotDeg: 0, zoom: 1.2, brightness: 1 } },
      ];
      for (const c of cases) {
        const after = paintLesion(canvas, CENTRE, A0 * c.f);
        const expected = ((after.truePx - before.truePx) / before.truePx) * 100;
        const today = cameraShift(await imageToCanvas(after.src), c.cam);
        const r = await compareVisits(before.src, today, CENTRE);
        rows.push({ name: `${name}: ${c.label}`, expected, measured: r.ok ? r.growthPct : null, pass: r.ok && Math.abs(r.growthPct - expected) <= 10, note: r.ok ? undefined : r.reason });
        setTests([...rows]);
      }
    }
    setTests(rows);
    setBusy(null);
  }

  const escalate = result?.ok && result.growthPct > ESCALATE_GROWTH_PCT;
  const box = "relative flex-1 aspect-square rounded-2xl bg-input-bg overflow-hidden flex items-center justify-center text-[11px] text-muted";

  return (
    <PageTransition>
      <div className="bg-primary px-4 pt-3 pb-5">
        <button onClick={() => router.back()} className="text-white p-1 -ml-1 mb-2"><ChevronLeft size={24} /></button>
        <h1 className="text-2xl font-bold text-white">Compare visits</h1>
        <p className="text-white/70 text-sm mt-0.5">Runs fully on the phone</p>
      </div>

      <div className="px-4 pt-4 pb-6 bg-warm-white">
        <div className="flex gap-3">
          {(["old", "new"] as const).map((w) => {
            const src = w === "old" ? oldSrc : newSrc;
            return (
              <div key={w} className="flex-1">
                <div
                  className={box}
                  onClick={(e) => {
                    if (w !== "old" || !src) return;
                    const r = e.currentTarget.getBoundingClientRect();
                    setSeed({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
                    setResult(null);
                  }}
                >
                  {src ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={w} className="absolute inset-0 w-full h-full object-cover" />
                      {w === "old" && seed && (
                        <span className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 border-white bg-danger" style={{ left: `${seed.x * 100}%`, top: `${seed.y * 100}%` }} />
                      )}
                    </>
                  ) : "No photo"}
                </div>
                <p className="text-xs font-bold text-dark mt-1.5">{w === "old" ? "Previous visit" : "Today"}</p>
                <button onClick={() => (w === "old" ? oldFile : newFile).current?.click()} className="text-[11px] text-primary font-semibold">Upload photo</button>
                <input ref={w === "old" ? oldFile : newFile} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0], w)} />
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted mt-1">{seed ? "Tap the previous photo to move the red marker onto the lesion." : "Marker is placed automatically; tap the previous photo to set it yourself."}</p>

        <div className="flex gap-2 mt-3 flex-wrap">
          <button onClick={() => loadDemo("same")} className="px-3 py-1.5 rounded-full bg-dark/5 text-dark text-[11px] font-semibold">Demo: same lesion, camera moved</button>
          <button onClick={() => loadDemo("grown")} className="px-3 py-1.5 rounded-full bg-dark/5 text-dark text-[11px] font-semibold">Demo: lesion grew</button>
        </div>

        <motion.button whileTap={{ scale: 0.96 }} disabled={!oldSrc || !newSrc || !!busy} onClick={run} className="w-full mt-4 py-3.5 rounded-full bg-dark text-white font-bold text-sm disabled:opacity-40">
          {busy ?? "Measure change"}
        </motion.button>

        {result && !result.ok && <p className="mt-4 text-sm text-danger font-semibold">{result.reason}</p>}

        {result?.ok && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
            <div className="flex gap-3">
              {[result.oldOverlay, result.newOverlay].map((s, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={s} alt={i ? "Today aligned" : "Previous"} className="flex-1 min-w-0 aspect-square object-cover rounded-2xl" />
              ))}
            </div>
            <p className="text-[11px] text-muted mt-1">Green outline = detected lesion. Today&apos;s photo is aligned to the previous one.</p>
            <div className="rounded-2xl p-4 mt-3" style={{ backgroundColor: escalate ? "#E6394615" : "#F59E0B15" }}>
              <p className="text-2xl font-black" style={{ color: escalate ? "#E63946" : "#F59E0B" }}>
                Lesion {result.growthPct >= 0 ? "grew" : "shrank"} {Math.abs(result.growthPct).toFixed(0)}%
              </p>
              <p className="text-sm text-muted mt-0.5">{escalate ? `Above ${ESCALATE_GROWTH_PCT}%: escalate to urgent referral` : "Within threshold: continue monitoring"}</p>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">Colour shift (ΔE)</span><span className="font-bold text-dark">{result.deltaE.toFixed(1)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Camera distance corrected</span><span className="font-bold text-dark">x{result.scale.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Alignment points</span><span className="font-bold text-dark">{result.inliers} of {result.matches}</span></div>
            </div>
            {result.warnings.map((w) => <p key={w} className="text-[11px] text-warning font-semibold mt-2">{w}</p>)}
            <p className="text-[11px] text-muted mt-3">Prototype measurement. Thresholds are not clinically validated.</p>
          </motion.div>
        )}

        <div className="mt-6 border-t border-neutral-100 pt-4">
          <p className="text-sm font-bold text-dark">Validation</p>
          <p className="text-[11px] text-muted mt-0.5">Paints a synthetic lesion of known size onto sample photos, moves the camera, and checks the measured growth matches.</p>
          <button onClick={selfTest} disabled={!!busy} className="mt-2 px-4 py-2 rounded-full border-2 border-dark text-dark text-xs font-bold disabled:opacity-40">Run self-test (8 cases)</button>
          {tests && (
            <div className="mt-3 space-y-1.5">
              {tests.map((t) => (
                <div key={t.name} className="flex justify-between gap-2 text-[11px]">
                  <span className="text-dark">{t.name}</span>
                  <span className={`font-bold whitespace-nowrap ${t.pass ? "text-success" : "text-danger"}`}>
                    {t.measured === null ? "fail" : `${t.measured.toFixed(0)}% (want ${t.expected.toFixed(0)}%)`}
                  </span>
                </div>
              ))}
              {tests.length === 8 && <p className="text-xs font-bold text-dark mt-2">{tests.filter((t) => t.pass).length} of 8 within ±10 points</p>}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
