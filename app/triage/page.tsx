"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import GradCamOverlay from "@/components/GradCamOverlay";
import { useStore } from "@/store/useStore";

export default function TriagePage() {
  const router = useRouter();
  const patients = useStore((s) => s.patients);
  const latestReferred = patients.find((p) => p.status === "referred");
  const patient = latestReferred || patients[0];

  const result = "refer" as const;
  const confidence = 0.87;
  const pattern = "Erythroplakia pattern";

  const bgColor = "#E63946";
  const label = "Refer urgently";

  return (
    <PageTransition>
      <div style={{ backgroundColor: bgColor }} className="relative pb-4">
        <div className="px-4 pt-3">
          <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">
            Screening result
          </p>
        </div>
        <div className="mx-4 mt-3 bg-[#FDE8E8] rounded-2xl h-44 relative overflow-hidden flex items-center justify-center">
          <div className="w-24 h-16 rounded-full bg-[#C9A08C]" />
          <GradCamOverlay size={90} x="55%" y="48%" />
        </div>
      </div>

      <div className="px-4 pt-4 pb-4 bg-warm-white">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 mb-4"
          style={{ backgroundColor: `${bgColor}15` }}
        >
          <p className="text-2xl font-black" style={{ color: bgColor }}>
            {label}
          </p>
          <p className="text-sm text-muted mt-0.5">
            {pattern} · confidence {confidence}
          </p>
        </motion.div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted">Image score</span>
            <span className="text-sm font-bold text-dark">High</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted">Habit risk</span>
            <span className="text-sm font-bold text-dark">
              {patient?.tobaccoHabit.types
                .map((t) => t.charAt(0).toUpperCase() + t.slice(1).replace("_", " "))
                .join(", ")}
              , {patient?.tobaccoHabit.durationYears} yrs
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted">Mouth opening</span>
            <span className="text-sm font-bold text-dark">
              {patient?.mouthOpening} mm
            </span>
          </div>
        </div>

        <p className="text-[11px] text-muted text-center mt-5 border-t border-neutral-100 pt-3">
          Triage support only. Not a diagnosis.
        </p>

        <div className="flex gap-3 mt-4">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push("/result")}
            className="flex-1 py-3.5 rounded-full text-white font-bold text-sm"
            style={{ backgroundColor: bgColor }}
          >
            Show Patient
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push("/dashboard")}
            className="flex-1 py-3.5 rounded-full bg-dark text-white font-bold text-sm"
          >
            Done
          </motion.button>
        </div>
      </div>
    </PageTransition>
  );
}
