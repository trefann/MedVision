"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Cloud, CloudOff, Play, RefreshCw, RotateCcw } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import TopBar from "@/components/TopBar";
import { useStore } from "@/store/useStore";
import { useDemo } from "@/store/useDemo";
import { useAnalysis } from "@/store/useAnalysis";
import { DEMO_STEPS } from "@/lib/demoSteps";
import { pendingCounts, syncNow } from "@/lib/sync";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export default function SyncPage() {
  const router = useRouter();
  const patients = useStore((s) => s.patients);
  const visits = useStore((s) => s.visits);
  const referrals = useStore((s) => s.referrals);
  const syncedSnapshot = useStore((s) => s.syncedSnapshot);
  const syncedAt = useStore((s) => s.syncedAt);
  const resetToSeed = useStore((s) => s.resetToSeed);
  const startDemo = useDemo((s) => s.start);

  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

  const pending = useMemo(
    () => pendingCounts({ patients, visits, referrals, syncedSnapshot }),
    [patients, visits, referrals, syncedSnapshot]
  );

  async function handleSync() {
    setSyncing(true);
    setMessage(null);
    const r = await syncNow();
    setMessage(r.ok ? { ok: true, text: `Uploaded ${r.sent} record${r.sent === 1 ? "" : "s"} to the server` } : { ok: false, text: r.message });
    setSyncing(false);
  }

  function beginGuidedDemo() {
    resetToSeed();
    useAnalysis.getState().reset();
    useAnalysis.getState().setLang("en");
    startDemo();
    router.push(DEMO_STEPS[0].route);
  }

  const allSynced = pending.total === 0;
  const stats = [
    { label: "Patients pending", value: pending.patients },
    { label: "Visits pending", value: pending.visits },
    { label: "Referrals pending", value: pending.referrals },
    { label: "Last sync", value: syncedAt ? new Date(syncedAt).toLocaleString() : "Never" },
    { label: "Model", value: "MobileNetV3-Small, on device" },
    { label: "Photos", value: "Stay on this phone" },
  ];

  return (
    <PageTransition>
      <TopBar title="Settings" />
      <div className="px-4 pb-4">
        <h2 className="text-xl font-bold text-dark mb-3">Sync</h2>

        <div className={`rounded-2xl p-4 mb-4 ${allSynced ? "bg-success/10" : "bg-warning/10"}`}>
          <div className="flex items-center gap-2">
            {online ? (
              <Cloud size={16} className={allSynced ? "text-success" : "text-warning"} />
            ) : (
              <CloudOff size={16} className="text-warning" />
            )}
            <p className="font-bold text-sm" style={{ color: allSynced ? "#16A34A" : "#F59E0B" }}>
              {allSynced ? "All synced" : online ? `${pending.total} records waiting` : "No connection"}
            </p>
          </div>
          <p className="text-xs text-muted mt-1">All screening works offline</p>
        </div>

        <div className="space-y-3 mb-5">
          {stats.map((stat) => (
            <div key={stat.label} className="flex justify-between items-center gap-3">
              <span className="text-sm text-muted">{stat.label}</span>
              <motion.span key={String(stat.value)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-bold text-dark text-right">
                {stat.value}
              </motion.span>
            </div>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleSync}
          disabled={syncing}
          className="w-full py-3.5 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing..." : "Sync now"}
        </motion.button>

        {message && (
          <p className="text-xs font-semibold text-center mt-3" style={{ color: message.ok ? "#16A34A" : "#F59E0B" }}>
            {message.text}
          </p>
        )}

        <p className="text-[11px] text-muted text-center mt-3">
          Sends de-identified records only: no names, ABHA numbers, notes or photos. After your first sync, uploads resume automatically when a network is found.
        </p>

        <div className="mt-8 border-t border-neutral-100 pt-5">
          <h2 className="text-xl font-bold text-dark mb-3">Demo</h2>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={beginGuidedDemo}
            className="w-full py-3.5 rounded-full bg-dark text-white font-bold text-sm flex items-center justify-center gap-2 mb-3"
          >
            <Play size={16} />
            Start guided demo
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={resetToSeed}
            className="w-full py-3.5 rounded-full border-2 border-danger text-danger font-bold text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            Reset Demo Data
          </motion.button>
          <p className="text-[11px] text-muted text-center mt-2">
            Restores all patients, visits, and referrals to initial state.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
