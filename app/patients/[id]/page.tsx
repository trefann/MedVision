"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import PageTransition from "@/components/PageTransition";
import TimelineEntry from "@/components/TimelineEntry";
import HabitChips from "@/components/HabitChips";
import RiskScoreBar from "@/components/RiskScoreBar";
import { ChevronLeft } from "lucide-react";

export default function PatientTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const patients = useStore((s) => s.patients);
  const allVisits = useStore((s) => s.visits);
  const patient = useMemo(() => patients.find((p) => p.id === id), [patients, id]);
  const visits = useMemo(
    () => allVisits.filter((v) => v.patientId === id).sort((a, b) => a.date.localeCompare(b.date)),
    [allVisits, id]
  );

  if (!patient) {
    return (
      <div className="p-4 text-center text-muted">Patient not found.</div>
    );
  }

  return (
    <PageTransition>
      <div className="bg-primary px-4 pt-3 pb-5">
        <button onClick={() => router.back()} className="text-white p-1 -ml-1 mb-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-white">{patient.name}, {patient.age}</h1>
        <p className="text-white/70 text-sm mt-0.5">
          {visits.length} visit{visits.length !== 1 ? "s" : ""} · ABHA {patient.abhaNumber.slice(-4)}
        </p>
      </div>

      <div className="px-4 pt-4 pb-4">
        <div className="mb-4">
          <HabitChips
            selected={patient.tobaccoHabit.types}
            onChange={() => {}}
            readonly
          />
          <p className="text-xs text-muted mt-2">
            Duration: {patient.tobaccoHabit.durationYears} years
            {patient.alcoholUse ? " · Alcohol use" : ""}
            {" · "}Mouth opening: {patient.mouthOpening} mm
          </p>
        </div>

        <RiskScoreBar score={patient.habitRiskScore} />

        <h2 className="text-lg font-bold text-dark mt-5 mb-3">Visit history</h2>
        <div>
          {visits.map((visit, i) => (
            <TimelineEntry
              key={visit.id}
              date={visit.date}
              notes={visit.notes}
              triageResult={visit.triageResult}
              isLast={i === visits.length - 1}
              index={i}
              onClick={() => {
                if (visits.length >= 2 && i > 0) {
                  router.push(`/patients/${id}/change?v1=${visits[i - 1].id}&v2=${visit.id}`);
                }
              }}
            />
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
