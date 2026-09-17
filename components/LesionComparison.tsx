"use client";

import { motion } from "framer-motion";

interface LesionComparisonProps {
  dateOld: string;
  dateNew: string;
  growthPercent: number;
  oldSizePx?: number;
  newSizePx?: number;
}

export default function LesionComparison({
  dateOld,
  dateNew,
  oldSizePx = 40,
  newSizePx = 56,
}: LesionComparisonProps) {
  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <div className="bg-[#FDE8E8] rounded-2xl h-40 flex items-center justify-center relative overflow-hidden">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="rounded-full bg-[#E6A08C]"
            style={{ width: oldSizePx, height: oldSizePx * 0.7 }}
          />
        </div>
        <p className="text-center text-sm font-semibold text-dark mt-2">
          {dateOld}
        </p>
      </div>

      <div className="flex-1">
        <div className="bg-[#FDE8E8] rounded-2xl h-40 flex items-center justify-center relative overflow-hidden">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="rounded-full bg-[#C94040]"
            style={{ width: newSizePx, height: newSizePx * 0.7 }}
          />
        </div>
        <p className="text-center text-sm font-semibold text-dark mt-2">
          {dateNew}
        </p>
      </div>
    </div>
  );
}
