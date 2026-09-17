"use client";

import { motion } from "framer-motion";
import { getRiskLabel, getRiskColor } from "@/lib/utils";

interface RiskScoreBarProps {
  score: number;
}

export default function RiskScoreBar({ score }: RiskScoreBarProps) {
  const label = getRiskLabel(score);
  const color = getRiskColor(score);
  const percent = (score / 10) * 100;

  return (
    <div className="bg-white rounded-[20px] p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-wider font-medium text-muted mb-1">
        Habit risk score
      </p>
      <p className="text-2xl font-black" style={{ color }}>
        {label} — {score} / 10
      </p>
      <div className="mt-3 h-2 bg-input-bg rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
