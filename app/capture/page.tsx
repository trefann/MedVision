"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ORAL_SITE_LABELS, OralSite } from "@/lib/types";
import PageTransition from "@/components/PageTransition";

const SITES: OralSite[] = [
  "buccal_mucosa_left",
  "buccal_mucosa_right",
  "tongue",
  "palate",
];

export default function CapturePage() {
  const router = useRouter();
  const [currentSite, setCurrentSite] = useState(0);
  const [captured, setCaptured] = useState<boolean[]>([false, false, false, false]);
  const [focusOk, setFocusOk] = useState(true);

  function handleCapture() {
    const next = [...captured];
    next[currentSite] = true;
    setCaptured(next);

    if (currentSite < 3) {
      setCurrentSite(currentSite + 1);
      setFocusOk(Math.random() > 0.3);
    } else {
      router.push("/triage");
    }
  }

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
          </div>
        </div>

        <div className="absolute top-3 right-4 flex gap-2 z-10">
          <span
            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
              focusOk
                ? "bg-success/90 text-white"
                : "bg-warning/90 text-dark"
            }`}
          >
            {focusOk ? "Focus ok" : "Move closer"}
          </span>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[200px] h-[140px] border-2 border-dashed border-white/50 rounded-[50%] flex items-center justify-center">
            <div className="w-[160px] h-[110px] rounded-[50%] bg-[#8B5E5E]/30" />
          </div>
        </div>

        <div className="absolute bottom-4 left-0 right-0 text-center">
          <p className="text-white/70 text-xs">
            Align lesion inside the guide
          </p>
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

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleCapture}
          className="w-full py-4 rounded-full bg-dark text-white font-bold text-base"
        >
          {currentSite < 3 ? "Capture" : "Capture & Analyse"}
        </motion.button>

        <p className="text-xs text-muted mt-3">
          Capture · 4 sites · 90 seconds
        </p>
      </div>
    </PageTransition>
  );
}
