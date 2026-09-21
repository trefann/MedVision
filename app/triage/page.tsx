"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import GradCamOverlay from "@/components/GradCamOverlay";
import HeatmapOverlay from "@/components/HeatmapOverlay";
import { useStore } from "@/store/useStore";
import { useAnalysis } from "@/store/useAnalysis";
import { HABIT_WEIGHT, HIGH_HABIT, IMAGE_WEIGHT, recheckMonths } from "@/lib/risk";

const TIER_UI = [
  { color: "#16A34A", label: "Looks healthy", note: "No suspicious pattern found" },
  { color: "#F59E0B", label: "Monitor", note: "Recheck in 4 weeks" },
  { color: "#E63946", label: "Refer urgently", note: "Suspicious lesion pattern" },
];

export default function TriagePage() {
  const router = useRouter();
  const patients = useStore((s) => s.patients);
  const photos = useAnalysis((s) => s.photos);
  const analysis = useAnalysis((s) => s.result);
  const fused = useAnalysis((s) => s.fused);
  const selectedId = useAnalysis((s) => s.patientId);
  const latestReferred = patients.find((p) => p.status === "referred");
  const usedSample = useAnalysis((s) => s.usedSample);
  const patient = analysis ? patients.find((p) => p.id === selectedId) : latestReferred || patients[0];

  const imageTier = analysis ? analysis.tier : 2;
  const tier = analysis ? (fused?.finalTier ?? analysis.tier) : 2;
  const ui = TIER_UI[tier];
  const confidence = analysis ? analysis.probs[imageTier].toFixed(2) : "0.87";
  const imageScore = analysis
    ? analysis.flagScore > 0.6 ? "High" : analysis.flagScore > 0.25 ? "Moderate" : "Low"
    : "High";
  const shownPhoto = analysis ? photos[analysis.photoIndex] : null;
  const bgColor = ui.color;

  useEffect(() => {
    if (!analysis || tier !== 2 || !patient) return;
    const { referrals, visits, addReferral } = useStore.getState();
    if (referrals.some((r) => r.patientId === patient.id && r.status !== "closed")) return;
    const last = visits.filter((v) => v.patientId === patient.id).sort((a, b) => a.date.localeCompare(b.date)).pop();
    addReferral({
      id: `r-${Date.now()}`,
      patientId: patient.id,
      visitId: last?.id ?? "",
      referredDate: new Date().toISOString().slice(0, 10),
      hospital: "Govt. Hospital, Chengalpattu",
      department: "Dental OPD",
      availableDays: "Tue and Thu",
      status: "flagged",
      remindersSent: 0,
    });
  }, [analysis, tier, patient]);

  if (!analysis) {
    return (
      <PageTransition>
        <div className="px-6 pt-20 text-center">
          <p className="text-2xl font-black text-dark">No screening yet</p>
          <p className="text-sm text-muted mt-2">Add photos in Capture to see a result here.</p>
          <button onClick={() => router.push("/capture")} className="mt-6 px-6 py-3 rounded-full bg-dark text-white font-bold text-sm">
            Start screening
          </button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div style={{ backgroundColor: bgColor }} className="relative pb-4">
        <div className="px-4 pt-3">
          <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">
            Screening result
          </p>
        </div>
        <div className="mx-4 mt-3 bg-[#FDE8E8] rounded-2xl h-44 relative overflow-hidden flex items-center justify-center">
          {analysis && shownPhoto ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shownPhoto} alt="Analysed site" className="absolute inset-0 w-full h-full object-cover" />
              {tier > 0 && <HeatmapOverlay heat={analysis.heat} />}
            </>
          ) : (
            <>
              <div className="w-24 h-16 rounded-full bg-[#C9A08C]" />
              <GradCamOverlay size={90} x="55%" y="48%" />
            </>
          )}
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
            {ui.label}
          </p>
          <p className="text-sm text-muted mt-0.5">
            {analysis ? ui.note : "Erythroplakia pattern"} · confidence {confidence}
          </p>
          {analysis && fused && tier === 0 && (
            <p className="text-xs font-semibold mt-1.5" style={{ color: bgColor }}>
              Recheck in {recheckMonths(0, fused.habit)} months{fused.habit >= HIGH_HABIT ? " because of high habit risk" : ""}
            </p>
          )}
          {fused?.escalated && (
            <p className="text-xs font-semibold mt-1.5" style={{ color: bgColor }}>
              Raised from {TIER_UI[imageTier].label.replace("Looks healthy", "Benign")} because of high habit risk
            </p>
          )}
        </motion.div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted">Image score</span>
            <span className="text-sm font-bold text-dark">{imageScore}</span>
          </div>
          {analysis && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">Sites analysed</span>
              <span className="text-sm font-bold text-dark">
                {analysis.perPhotoTiers.filter((t) => t >= 0).length} of 4
              </span>
            </div>
          )}
          {analysis && fused && (
            <div className="flex justify-between items-start">
              <span className="text-sm text-muted">Combined risk</span>
              <span className="text-sm font-bold text-dark text-right">
                {Math.round(fused.combined * 100)}%
                <span className="block text-[10px] font-normal text-muted">
                  {patient
                    ? `${IMAGE_WEIGHT * 100}% image + ${HABIT_WEIGHT * 100}% habits (${patient.habitRiskScore}/10)`
                    : "Photo only: habits not recorded"}
                </span>
              </span>
            </div>
          )}
          {patient ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted">Patient</span>
                <span className="text-sm font-bold text-dark">{patient.name}, {patient.age}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted">Habit risk</span>
                <span className="text-sm font-bold text-dark">
                  {patient.tobaccoHabit.types
                    .map((t) => t.charAt(0).toUpperCase() + t.slice(1).replace("_", " "))
                    .join(", ")}
                  , {patient.tobaccoHabit.durationYears} yrs
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted">Mouth opening</span>
                <span className="text-sm font-bold text-dark">{patient.mouthOpening} mm</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">Patient</span>
              <span className="text-sm font-bold text-dark">Walk-in, no record</span>
            </div>
          )}
          {analysis && usedSample && patient && (
            <p className="text-[11px] font-semibold text-warning">Demo sample photo, not this patient&apos;s own mouth.</p>
          )}
          {analysis && tier === 2 && !patient && (
            <p className="text-[11px] font-semibold text-warning">Not linked to a patient record, so no referral is tracked. Register the patient to follow up.</p>
          )}
        </div>

        <p className="text-[11px] text-muted text-center mt-5 border-t border-neutral-100 pt-3">
          {analysis
            ? "Triage support only. Not a diagnosis. Prototype model, not clinically validated."
            : "Triage support only. Not a diagnosis."}
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
