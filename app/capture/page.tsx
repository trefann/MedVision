"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ORAL_SITE_LABELS, OralSite } from "@/lib/types";
import PageTransition from "@/components/PageTransition";
import { WALK_IN, useAnalysis } from "@/store/useAnalysis";
import { analysePhotos, downscaleFile, urlToDataUrl } from "@/lib/triage";
import { useStore } from "@/store/useStore";
import { fuseRisk } from "@/lib/risk";
import { Quality, QUALITY_MESSAGE, measureQuality } from "@/lib/quality";

const SITES: OralSite[] = [
  "buccal_mucosa_left",
  "buccal_mucosa_right",
  "tongue",
  "palate",
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function CapturePage() {
  const router = useRouter();
  const [currentSite, setCurrentSite] = useState(0);
  const [captured, setCaptured] = useState<boolean[]>([false, false, false, false]);
  const [quality, setQuality] = useState<(Quality | null)[]>([null, null, null, null]);
  const [analysing, setAnalysing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photos = useAnalysis((s) => s.photos);
  const setPhoto = useAnalysis((s) => s.setPhoto);
  const setResult = useAnalysis((s) => s.setResult);
  const patients = useStore((s) => s.patients);
  const patientId = useAnalysis((s) => s.patientId) ?? WALK_IN;
  const setPatientId = useAnalysis((s) => s.setPatientId);

  useEffect(() => {
    useAnalysis.getState().reset();
  }, []);

  async function accept(site: number, src: string, sample = false) {
    setPhoto(site, src);
    if (sample) useAnalysis.getState().setUsedSample(true);
    const q = await measureQuality(src);
    setQuality((prev) => prev.map((v, i) => (i === site ? q : v)));
  }

  async function onFile(file?: File) {
    if (file) await accept(currentSite, await downscaleFile(file));
  }

  async function loadSample(name: string) {
    const srcs = await Promise.all([0, 1, 2, 3].map((i) => urlToDataUrl(`/samples/${name}-${i}.jpg`)));
    for (let i = 0; i < srcs.length; i++) await accept(i, srcs[i], true);
    setCurrentSite(0);
    setCaptured([false, false, false, false]);
  }

  async function analyse() {
    setAnalysing(true);
    try {
      const a = await analysePhotos(useAnalysis.getState().photos);
      setResult(a);
      const habit = patients.find((p) => p.id === patientId)?.habitRiskScore ?? 0;
      useAnalysis.getState().setFused(a ? fuseRisk(a.tier, a.probs, habit) : null);
    } catch {
      setResult(null);
    }
    router.push("/triage");
  }

  async function handleCapture() {
    if (!photos[currentSite]) return;
    const next = [...captured];
    next[currentSite] = true;
    setCaptured(next);

    if (currentSite < 3) {
      setCurrentSite(currentSite + 1);
      return;
    }
    await analyse();
  }

  async function playSample(name: string) {
    const srcs = await Promise.all([0, 1, 2, 3].map((i) => urlToDataUrl(`/samples/${name}-${i}.jpg`)));
    for (let i = 0; i < srcs.length; i++) await accept(i, srcs[i], true);
    setCaptured([false, false, false, false]);
    for (let i = 0; i < 4; i++) {
      setCurrentSite(i);
      await sleep(1100);
      setCaptured((prev) => prev.map((v, k) => v || k <= i));
    }
    await analyse();
  }

  function skipSite() {
    if (currentSite < 3) setCurrentSite(currentSite + 1);
    else if (photos.some(Boolean)) void analyse();
  }

  const demoRun = useAnalysis((s) => s.demoRun);
  const demoStarted = useRef(false);
  useEffect(() => {
    if (!demoRun || demoStarted.current) return;
    demoStarted.current = true;
    useAnalysis.setState({ demoRun: false });
    setTimeout(() => {
      demoStarted.current = false;
      void playSample("refer");
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoRun]);

  const canSkip = !photos[currentSite] && !analysing && (currentSite < 3 || photos.some(Boolean));
  const capturedCount = captured.filter(Boolean).length;
  const progressPercent = (capturedCount / 4) * 100;

  return (
    <PageTransition>
      <div className="bg-dark relative" style={{ height: 380 }}>
        <div className="absolute top-3 left-0 right-0 px-4 flex items-center justify-between z-10">
          <div>
            <p className="text-white font-bold text-sm">
              Site {currentSite + 1} of 4
            </p>
            <p className="text-white/60 text-xs">
              {ORAL_SITE_LABELS[SITES[currentSite]]}
            </p>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              aria-label="Patient"
              className="mt-1.5 bg-white/20 text-white text-[10px] font-semibold rounded-lg px-2 py-1 max-w-[150px]"
            >
              <option value={WALK_IN} style={{ color: "#111" }}>Walk-in (no record)</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id} style={{ color: "#111" }}>{p.name}, {p.age}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="absolute top-3 right-4 flex gap-2 z-10">
          <span
            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
              !photos[currentSite] || !quality[currentSite]
                ? "bg-white/20 text-white"
                : quality[currentSite]!.ok
                ? "bg-success/90 text-white"
                : "bg-warning/90 text-dark"
            }`}
          >
            {!photos[currentSite] || !quality[currentSite]
              ? "No photo"
              : quality[currentSite]!.ok
              ? "Photo ok"
              : quality[currentSite]!.issue === "blurry"
              ? "Too blurry"
              : quality[currentSite]!.issue === "dark"
              ? "Too dark"
              : "Too bright"}
          </span>
        </div>

        {photos[currentSite] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photos[currentSite]!} alt="Captured site" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[200px] h-[140px] border-2 border-dashed border-white/50 rounded-[50%] flex items-center justify-center">
            {!photos[currentSite] && <div className="w-[160px] h-[110px] rounded-[50%] bg-[#8B5E5E]/30" />}
          </div>
        </div>

        <div className="absolute bottom-3 left-0 right-0 px-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <div className="flex gap-1.5 justify-center flex-wrap">
            <button onClick={() => fileRef.current?.click()} className="px-2.5 py-1 rounded-full bg-white text-dark text-[10px] font-bold">
              Upload photo
            </button>
            {["benign", "monitor", "refer"].map((n) => (
              <button key={n} onClick={() => loadSample(n)} className="px-2.5 py-1 rounded-full bg-white/20 text-white text-[10px] font-semibold capitalize">
                Sample: {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-warm-white px-4 pt-5 pb-4 flex flex-col items-center">
        <div className="relative w-20 h-20 mb-4">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="35"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="4"
            />
            <motion.circle
              cx="40"
              cy="40"
              r="35"
              fill="none"
              stroke="#0C8C8C"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={220}
              animate={{ strokeDashoffset: 220 - (220 * progressPercent) / 100 }}
              transition={{ duration: 0.4 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-dark">
              {capturedCount}/4
            </span>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-11 h-11 rounded-xl overflow-hidden bg-input-bg border-2 ${i === currentSite ? "border-primary" : "border-transparent"}`}
            >
              {photos[i] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photos[i]!} alt={`Site ${i + 1}`} className="w-full h-full object-cover" />
              )}
            </div>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleCapture}
          disabled={analysing || !photos[currentSite] || (!!quality[currentSite] && !quality[currentSite]!.ok)}
          className="w-full py-4 disabled:opacity-60 rounded-full bg-dark text-white font-bold text-base"
        >
          {analysing ? "Analysing on device..." : !photos[currentSite] ? "Add a photo to continue" : quality[currentSite] && !quality[currentSite]!.ok ? "Retake photo" : currentSite < 3 ? "Capture" : "Capture & Analyse"}
        </motion.button>

        {canSkip && (
          <button onClick={skipSite} className="text-xs font-semibold text-primary mt-2">
            {currentSite < 3 ? "Skip this site" : "Skip and analyse"}
          </button>
        )}

        <p className={`text-xs mt-3 ${quality[currentSite] && !quality[currentSite]!.ok ? "text-warning font-semibold" : "text-muted"}`}>
          {quality[currentSite] && !quality[currentSite]!.ok
            ? QUALITY_MESSAGE[quality[currentSite]!.issue!]
            : "Capture · 4 sites · 90 seconds"}
        </p>
      </div>
    </PageTransition>
  );
}
