"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import PageTransition from "@/components/PageTransition";
import TopBar from "@/components/TopBar";
import HabitChips from "@/components/HabitChips";
import RiskScoreBar from "@/components/RiskScoreBar";
import { TobaccoType } from "@/lib/types";
import { generateId, calculateHabitRisk } from "@/lib/utils";
import { motion } from "framer-motion";

export default function NewPatientPage() {
  const router = useRouter();
  const addPatient = useStore((s) => s.addPatient);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [abha, setAbha] = useState("");
  const [habits, setHabits] = useState<TobaccoType[]>([]);
  const [duration, setDuration] = useState(5);
  const [alcohol, setAlcohol] = useState(false);
  const [mouthOpening, setMouthOpening] = useState(40);

  const riskScore = calculateHabitRisk(habits, duration, alcohol, mouthOpening);

  function handleSubmit() {
    if (!name.trim()) return;
    addPatient({
      id: generateId(),
      name: name.trim(),
      age: parseInt(age) || 30,
      abhaNumber: abha || "91 0000 0000 0000",
      tobaccoHabit: { types: habits, durationYears: duration },
      alcoholUse: alcohol,
      mouthOpening,
      habitRiskScore: riskScore,
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
    });
    router.push("/patients");
  }

  return (
    <PageTransition>
      <TopBar title="New patient" showBack />
      <div className="px-4 pb-6">
        <label className="block mb-1 text-[11px] uppercase tracking-wider font-medium text-muted">
          ABHA number
        </label>
        <input
          value={abha}
          onChange={(e) => setAbha(e.target.value)}
          placeholder="91 4402 8871 4412"
          className="w-full bg-input-bg rounded-2xl px-4 py-3.5 text-dark text-sm outline-none mb-4"
        />

        <div className="flex gap-3 mb-4">
          <div className="flex-[2]">
            <label className="block mb-1 text-[11px] uppercase tracking-wider font-medium text-muted">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Patient name"
              className="w-full bg-input-bg rounded-2xl px-4 py-3.5 text-dark text-sm outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block mb-1 text-[11px] uppercase tracking-wider font-medium text-muted">
              Age
            </label>
            <input
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="40"
              type="number"
              className="w-full bg-input-bg rounded-2xl px-4 py-3.5 text-dark text-sm outline-none"
            />
          </div>
        </div>

        <label className="block mb-2 text-[11px] uppercase tracking-wider font-medium text-muted">
          Tobacco habit
        </label>
        <HabitChips selected={habits} onChange={setHabits} />

        <label className="block mt-4 mb-1 text-[11px] uppercase tracking-wider font-medium text-muted">
          Duration
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={40}
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="flex-1 accent-[#E63946]"
          />
          <span className="text-sm font-bold text-dark w-16 text-right">
            {duration} years
          </span>
        </div>

        <label className="flex items-center gap-3 mt-4 mb-2">
          <div
            className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${alcohol ? "bg-danger" : "bg-neutral-200"}`}
            onClick={() => setAlcohol(!alcohol)}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${alcohol ? "left-[18px]" : "left-0.5"}`}
            />
          </div>
          <span className="text-sm text-dark font-medium">Alcohol use</span>
        </label>

        <label className="block mt-4 mb-1 text-[11px] uppercase tracking-wider font-medium text-muted">
          Mouth opening (mm)
        </label>
        <input
          type="number"
          value={mouthOpening}
          onChange={(e) => setMouthOpening(parseInt(e.target.value) || 0)}
          className="w-full bg-input-bg rounded-2xl px-4 py-3.5 text-dark text-sm outline-none mb-4"
        />

        <RiskScoreBar score={riskScore} />

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleSubmit}
          className="w-full mt-5 py-3.5 rounded-full bg-primary text-white font-bold text-sm active:bg-primary-dark transition-colors"
        >
          Register Patient
        </motion.button>
      </div>
    </PageTransition>
  );
}
