"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import PageTransition from "@/components/PageTransition";
import GradCamOverlay from "@/components/GradCamOverlay";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import { Phone, RotateCcw, ChevronLeft } from "lucide-react";

export default function ReviewPage() {
  const router = useRouter();
  const { patients, visits, referrals } = useStore();

  const urgentReferrals = referrals.filter(
    (r) => r.status === "overdue" || r.status === "referred"
  );

  const reviewCase = urgentReferrals[0];
  const patient = patients.find((p) => p.id === reviewCase?.patientId);
  const visit = visits.find((v) => v.id === reviewCase?.visitId);
  const patientVisits = visits.filter(
    (v) => v.patientId === reviewCase?.patientId
  );
  const prevVisit = patientVisits[patientVisits.length - 2];

  if (!reviewCase || !patient || !visit) {
    return (
      <PageTransition>
        <div className="px-4 pt-3">
          <button onClick={() => router.back()} className="text-dark p-1 -ml-1">
            <ChevronLeft size={24} />
          </button>
        </div>
        <div className="p-4 text-center text-muted">
          No urgent cases to review.
        </div>
      </PageTransition>
    );
  }

  const growth =
    prevVisit && prevVisit.lesionAreaMm2 > 0
      ? Math.round(
          ((visit.lesionAreaMm2 - prevVisit.lesionAreaMm2) /
            prevVisit.lesionAreaMm2) *
            1000
        ) / 10
      : 0;
  const interval = prevVisit
    ? Math.round(
        (new Date(visit.date).getTime() - new Date(prevVisit.date).getTime()) /
          (1000 * 60 * 60 * 24 * 7)
      )
    : 0;

  return (
    <PageTransition>
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="text-dark p-1 -ml-1">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-dark">Review queue</h1>
        </div>
        <span className="bg-danger text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
          {urgentReferrals.length} urgent
        </span>
      </div>

      <div className="mx-4 mt-3 bg-[#FDE8E8] rounded-2xl h-44 relative overflow-hidden flex items-center justify-center">
        <div className="w-20 h-14 rounded-full bg-[#C94040]" />
        <GradCamOverlay size={85} x="55%" y="45%" />
        <div className="absolute bottom-2 left-3 bg-dark/70 text-white text-[10px] px-2 py-1 rounded-lg font-medium">
          Site 2 · {formatDate(visit.date)}
        </div>
      </div>

      <div className="px-4 pt-4 pb-4">
        <h2 className="text-lg font-bold text-dark">
          {patient.name}, {patient.age} · {reviewCase.hospital.split(",")[1]?.trim() || "Local"}
        </h2>
        <p className="text-xs text-muted">
          Flagged by ASHA Kavitha R
        </p>

        <div className="mt-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted">Model tier</span>
            <span className="text-sm font-bold text-danger">Refer urgently</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted">Growth</span>
            <span className="text-sm font-bold text-dark">
              +{growth}% in {interval} wk
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted">Habit risk</span>
            <span className="text-sm font-bold text-dark">
              {patient.habitRiskScore} / 10
            </span>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push("/dashboard")}
            className="flex-1 py-3.5 rounded-full bg-danger text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <Phone size={16} />
            Call for biopsy
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push("/dashboard")}
            className="flex-1 py-3.5 rounded-full border-2 border-dark text-dark font-bold text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            Recheck 4 wk
          </motion.button>
        </div>
      </div>
    </PageTransition>
  );
}
