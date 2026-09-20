"use client";

import { Check } from "lucide-react";
import type { ReferralStatus } from "@/lib/types";
import { STAGES, stageIndex } from "@/lib/referral";

interface Props {
  status: ReferralStatus;
  compact?: boolean;
}

const GREEN = "#16A34A";
const AMBER = "#F59E0B";
const RED = "#E63946";
const GREY = "#D1D5DB";

export default function ReferralTracker({ status, compact = false }: Props) {
  const current = stageIndex(status);
  const overdue = status === "overdue";
  const colourFor = (i: number) => (i < current ? GREEN : i === current ? (overdue ? RED : AMBER) : GREY);
  const size = compact ? 10 : 22;

  return (
    <div>
      <div className="flex items-center">
        {STAGES.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div
              className="rounded-full flex items-center justify-center shrink-0"
              style={{ width: size, height: size, backgroundColor: colourFor(i) }}
              aria-label={`${label}: ${i < current ? "done" : i === current ? "current" : "pending"}`}
            >
              {!compact && i < current && <Check size={13} color="#fff" strokeWidth={3} />}
              {!compact && i === current && <span className="w-2 h-2 rounded-full bg-white" />}
            </div>
            {i < STAGES.length - 1 && (
              <div className="h-[3px] flex-1 mx-1 rounded-full" style={{ backgroundColor: i < current ? GREEN : GREY }} />
            )}
          </div>
        ))}
      </div>
      {!compact && (
        <div className="flex justify-between mt-1.5">
          {STAGES.map((label, i) => (
            <span
              key={label}
              className={`text-[10px] ${i === current ? "font-bold text-dark" : "text-muted"}`}
              style={{ width: `${100 / STAGES.length}%`, textAlign: i === 0 ? "left" : i === STAGES.length - 1 ? "right" : "center" }}
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
