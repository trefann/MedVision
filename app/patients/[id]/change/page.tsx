"use client";

import { useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import PageTransition from "@/components/PageTransition";
import LesionComparison from "@/components/LesionComparison";
import { motion } from "framer-motion";
import {
  formatDate,
  calculateGrowthPercent,
  daysBetween,
  weeksLabel,
} from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

export default function ChangeDetectionPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const patients = useStore((s) => s.patients);
  const storeVisits = useStore((s) => s.visits);
  const patient = useMemo(() => patients.find((p) => p.id === id), [patients, id]);
  const allVisits = useMemo(
    () => storeVisits.filter((v) => v.patientId === id).sort((a, b) => a.date.localeCompare(b.date)),
    [storeVisits, id]
  );

  const v1Id = searchParams.get("v1");
  const v2Id = searchParams.get("v2");

  const visit1 = allVisits.find((v) => v.id === v1Id) || allVisits[allVisits.length - 2];
  const visit2 = allVisits.find((v) => v.id === v2Id) || allVisits[allVisits.length - 1];

  if (!patient || !visit1 || !visit2) {
    return <div className="p-4 text-muted">Insufficient visit data.</div>;
  }

  const growth = calculateGrowthPercent(visit1.lesionAreaMm2, visit2.lesionAreaMm2);
  const days = daysBetween(visit1.date, visit2.date);
  const isUrgent = growth > 15;

  return (
    <PageTransition>
      <div className="bg-primary px-4 pt-3 pb-5">
        <button onClick={() => router.back()} className="text-white p-1 -ml-1 mb-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-white">
          {patient.name}, {patient.age}
        </h1>
        <p className="text-white/70 text-sm mt-0.5">
          ABHA {patient.abhaNumber}
        </p>
      </div>

      <div className="px-4 pt-4 pb-4 bg-warm-white">
        <LesionComparison
          dateOld={formatDate(visit1.date)}
          dateNew={formatDate(visit2.date)}
          growthPercent={growth}
          oldSizePx={40}
          newSizePx={Math.round(40 * (1 + growth / 100))}
        />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className={`mt-4 rounded-2xl p-4 ${
            isUrgent ? "bg-danger/10" : "bg-warning/10"
          }`}
        >
          <p
            className="text-xl font-black"
            style={{ color: isUrgent ? "#E63946" : "#F59E0B" }}
          >
            Lesion grew {growth}%
          </p>
          <p className="text-sm text-muted mt-0.5">
            {isUrgent
              ? "Escalated to urgent referral"
              : "Continue monitoring"}
          </p>
        </motion.div>

        <div className="mt-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted">Area change</span>
            <span className="text-sm font-bold text-dark">+{growth}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted">Colour shift</span>
            <span className="text-sm font-bold text-dark">
              {visit1.colourDescription} → {visit2.colourDescription}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted">Interval</span>
            <span className="text-sm font-bold text-dark">
              {weeksLabel(days)}
            </span>
          </div>
        </div>

        <button
          onClick={() => router.push("/compare")}
          className="w-full mt-5 py-3.5 rounded-full border-2 border-dark text-dark font-bold text-sm"
        >
          Measure change from new photos
        </button>
      </div>
    </PageTransition>
  );
}
