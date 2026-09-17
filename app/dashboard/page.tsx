"use client";

import { useStore } from "@/store/useStore";
import PageTransition from "@/components/PageTransition";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Volume2, Tent, Stethoscope } from "lucide-react";

export default function DashboardPage() {
  const { patients, referrals, visits } = useStore();

  const screened = visits.length > 0 ? 214 : 0;
  const flagged = referrals.length;
  const reached = referrals.filter(
    (r) => r.status === "reached" || r.status === "biopsied" || r.status === "closed"
  ).length;

  const overdueCount = referrals.filter((r) => r.status === "overdue").length;

  const followUpList = referrals.map((ref) => {
    const patient = patients.find((p) => p.id === ref.patientId);
    return { ...ref, patient };
  });

  return (
    <PageTransition>
      <div className="bg-primary px-5 pt-4 pb-6">
        <h1 className="text-2xl font-bold text-white mb-5">Your follow-ups</h1>
        <div className="flex gap-2">
          <StatCard label="Screened" value={screened} />
          <StatCard label="Flagged" value={flagged} />
          <StatCard label="Reached" value={reached} />
        </div>
      </div>

      <div className="flex gap-2 px-4 -mt-3">
        <Link href="/camp" className="flex-1">
          <div className="bg-dark text-white rounded-2xl p-3 flex items-center gap-2 active:scale-95 transition-transform">
            <Tent size={18} />
            <span className="text-xs font-semibold">Camp Mode</span>
          </div>
        </Link>
        <Link href="/review" className="flex-1">
          <div className="bg-danger text-white rounded-2xl p-3 flex items-center gap-2 active:scale-95 transition-transform">
            <Stethoscope size={18} />
            <span className="text-xs font-semibold">Review Queue</span>
          </div>
        </Link>
      </div>

      <div className="px-4 pt-5 pb-4">
        <div className="space-y-3">
          {followUpList.map((ref) => (
            <Link key={ref.id} href={`/patients/${ref.patientId}`}>
              <div className="flex items-center gap-3 bg-white rounded-[20px] p-4 shadow-sm active:scale-[0.98] transition-transform">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {ref.patient?.name.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-dark text-[15px]">
                    {ref.patient?.name}
                  </p>
                  <p className="text-xs text-muted">
                    Referred {formatDate(ref.referredDate)}
                  </p>
                </div>
                <StatusBadge status={ref.status} size="sm" />
              </div>
            </Link>
          ))}
        </div>

        {overdueCount > 0 && (
          <button className="w-full mt-4 py-3.5 rounded-full bg-dark text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <Volume2 size={16} />
            Send voice reminders ({overdueCount})
          </button>
        )}
      </div>
    </PageTransition>
  );
}
