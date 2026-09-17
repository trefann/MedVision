"use client";

import { motion } from "framer-motion";
import { formatDate, getTriageColor } from "@/lib/utils";
import StatusBadge from "./StatusBadge";

interface TimelineEntryProps {
  date: string;
  notes: string;
  triageResult: string;
  isLast?: boolean;
  index?: number;
  onClick?: () => void;
}

export default function TimelineEntry({
  date,
  notes,
  triageResult,
  isLast = false,
  index = 0,
  onClick,
}: TimelineEntryProps) {
  const color = getTriageColor(triageResult);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex gap-3 cursor-pointer active:bg-neutral-50 rounded-xl p-2 -ml-2 transition-colors"
      onClick={onClick}
    >
      <div className="flex flex-col items-center">
        <div
          className="w-3.5 h-3.5 rounded-full border-[3px] shrink-0"
          style={{ borderColor: color, backgroundColor: `${color}30` }}
        />
        {!isLast && <div className="w-0.5 flex-1 bg-neutral-200 mt-1" />}
      </div>

      <div className="flex-1 pb-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-dark">{formatDate(date)}</p>
          <StatusBadge status={triageResult} size="sm" />
        </div>
        <p className="text-xs text-muted mt-0.5">{notes}</p>
      </div>
    </motion.div>
  );
}
