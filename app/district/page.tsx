"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { useStore } from "@/store/useStore";
import { RISK_FACTORS, SIMULATED_PHCS, WEEKLY_SCREENED, livePhc, totals } from "@/lib/district";

export default function DistrictPage() {
  const router = useRouter();
  const referrals = useStore((s) => s.referrals);
  const visits = useStore((s) => s.visits);

  const phcs = useMemo(() => [livePhc(referrals, visits.length > 0 ? 214 : 0), ...SIMULATED_PHCS], [referrals, visits]);
  const t = totals(phcs);
  const completion = t.flagged ? Math.round((t.reached / t.flagged) * 100) : 0;
  const worst = [...phcs].sort((a, b) => b.overdue - a.overdue)[0];
  const maxWeek = Math.max(...WEEKLY_SCREENED);
  const steps = [
    { label: "Flagged", n: t.flagged },
    { label: "Referred", n: t.referred },
    { label: "Reached", n: t.reached },
    { label: "Biopsy", n: t.biopsy },
  ];

  return (
    <PageTransition>
      <div className="bg-dark px-4 pt-3 pb-5">
        <button onClick={() => router.back()} className="text-white p-1 -ml-1 mb-2"><ChevronLeft size={24} /></button>
        <h1 className="text-2xl font-bold text-white">District view</h1>
        <p className="text-white/60 text-sm mt-0.5">Chengalpattu · anonymised counts only</p>
        <div className="flex gap-2 mt-4">
          {[
            { l: "Screened", v: t.screened },
            { l: "Flagged", v: t.flagged },
            { l: "Reached hospital", v: `${completion}%` },
          ].map((k) => (
            <div key={k.l} className="flex-1 bg-white/10 rounded-2xl p-3">
              <p className="text-white text-xl font-black leading-none">{k.v}</p>
              <p className="text-white/60 text-[10px] mt-1">{k.l}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 pb-6 bg-warm-white">
        <p className="text-[11px] bg-warning/15 text-dark rounded-xl px-3 py-2">
          Sample data for demonstration. Only the Melmaruvathur row is live and updates as you move patients through referral stages.
        </p>

        <div className="bg-white rounded-[20px] p-4 shadow-sm mt-4">
          <p className="text-[11px] uppercase tracking-wider font-medium text-muted mb-3">Where patients are lost</p>
          <div className="space-y-2">
            {steps.map((s, i) => {
              const drop = i > 0 && steps[i - 1].n ? Math.round((1 - s.n / steps[i - 1].n) * 100) : null;
              return (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="text-xs text-dark w-16">{s.label}</span>
                  <div className="flex-1 h-2.5 bg-input-bg rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${t.flagged ? (s.n / t.flagged) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs font-bold text-dark w-8 text-right">{s.n}</span>
                  <span className="text-[10px] w-9 text-right" style={{ color: drop && drop > 25 ? "#E63946" : "#6B7280" }}>
                    {drop === null ? "" : `-${drop}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-[20px] p-4 shadow-sm mt-4">
          <p className="text-[11px] uppercase tracking-wider font-medium text-muted mb-2">Health centres</p>
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1.5 text-xs items-center">
            <span className="text-muted text-[10px]">PHC</span>
            <span className="text-muted text-[10px] text-right">Flagged</span>
            <span className="text-muted text-[10px] text-right">Reached</span>
            <span className="text-muted text-[10px] text-right">Overdue</span>
            {phcs.map((p) => {
              const pct = p.flagged ? Math.round((p.reached / p.flagged) * 100) : 0;
              return (
                <div key={p.name} className="contents">
                  <span className="text-dark font-semibold truncate">{p.name}{p.live ? " (live)" : ""}</span>
                  <span className="text-right text-dark">{p.flagged}</span>
                  <span className="text-right" style={{ color: pct < 50 ? "#E63946" : "#16A34A" }}>{pct}%</span>
                  <span className="text-right font-bold" style={{ color: p.overdue >= 5 ? "#E63946" : "#111" }}>{p.overdue}</span>
                </div>
              );
            })}
          </div>
          {worst && worst.overdue > 0 && (
            <p className="text-xs font-semibold text-danger mt-3">Needs attention: {worst.name} has {worst.overdue} overdue referrals</p>
          )}
        </div>

        <div className="bg-white rounded-[20px] p-4 shadow-sm mt-4">
          <p className="text-[11px] uppercase tracking-wider font-medium text-muted mb-3">Screenings per week (simulated)</p>
          <div className="flex items-end gap-1.5 h-24">
            {WEEKLY_SCREENED.map((n, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end items-center h-full">
                <div className="w-full rounded-t-md bg-primary" style={{ height: `${(n / maxWeek) * 100}%` }} title={`${n}`} />
                <span className="text-[9px] text-muted mt-1">W{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[20px] p-4 shadow-sm mt-4">
          <p className="text-[11px] uppercase tracking-wider font-medium text-muted mb-3">Risk factors among flagged (simulated)</p>
          <div className="space-y-2">
            {RISK_FACTORS.map((r) => (
              <div key={r.label} className="flex items-center gap-2">
                <span className="text-xs text-dark w-16">{r.label}</span>
                <div className="flex-1 h-2 bg-input-bg rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-danger" style={{ width: `${r.pct}%` }} />
                </div>
                <span className="text-xs font-bold text-dark w-8 text-right">{r.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-muted mt-4 flex items-start gap-1.5">
          <ShieldCheck size={14} className="shrink-0 mt-px" />
          District officers see counts only, never names or photos. Access would be role-based in production.
        </p>
      </div>
    </PageTransition>
  );
}
