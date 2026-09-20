"use client";

import { GRID } from "@/lib/triage";

export default function HeatmapOverlay({ heat }: { heat: number[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-0" style={{ filter: "blur(14px)" }}>
        <div className="w-full h-full grid" style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}>
          {heat.map((v, i) => (
            <div
              key={i}
              style={{
                backgroundColor: v > 0.25 ? `rgba(230,57,70,${(v * 0.75).toFixed(2)})` : `rgba(245,158,11,${(v * 0.5).toFixed(2)})`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="absolute bottom-2 right-2 bg-dark/70 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
        Saliency map
      </div>
    </div>
  );
}
