"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import PageTransition from "@/components/PageTransition";
import TopBar from "@/components/TopBar";
import { motion } from "framer-motion";
import { WifiOff, RefreshCw, RotateCcw } from "lucide-react";

export default function SyncPage() {
  const { syncState, simulateSync, resetToSeed } = useStore();
  const [syncing, setSyncing] = useState(false);

  function handleSync() {
    setSyncing(true);
    setTimeout(() => {
      simulateSync();
      setSyncing(false);
    }, 2000);
  }

  const isFullySynced =
    syncState.visitsQueued === 0 && syncState.imagesPending === 0;

  return (
    <PageTransition>
      <TopBar title="Settings" />
      <div className="px-4 pb-4">
        <h2 className="text-xl font-bold text-dark mb-3">Sync</h2>

        <div
          className={`rounded-2xl p-4 mb-4 ${
            isFullySynced ? "bg-success/10" : "bg-warning/10"
          }`}
        >
          <div className="flex items-center gap-2">
            <WifiOff
              size={16}
              className={isFullySynced ? "text-success" : "text-warning"}
            />
            <p
              className="font-bold text-sm"
              style={{ color: isFullySynced ? "#16A34A" : "#F59E0B" }}
            >
              {isFullySynced ? "All synced" : "No connection"}
            </p>
          </div>
          <p className="text-xs text-muted mt-1">
            All screening works offline
          </p>
        </div>

        <div className="space-y-3 mb-5">
          {[
            { label: "Visits queued", value: syncState.visitsQueued },
            { label: "Images pending", value: syncState.imagesPending },
            { label: "Queue size", value: `${syncState.queueSizeMb} MB` },
            { label: "Last sync", value: syncState.lastSync },
            { label: "Model version", value: `${syncState.modelVersion} on device` },
          ].map((stat) => (
            <div key={stat.label} className="flex justify-between items-center">
              <span className="text-sm text-muted">{stat.label}</span>
              <motion.span
                key={String(stat.value)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm font-bold text-dark"
              >
                {stat.value}
              </motion.span>
            </div>
          ))}
        </div>

        {!isFullySynced && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleSync}
            disabled={syncing}
            className="w-full py-3.5 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing..." : "Simulate Sync"}
          </motion.button>
        )}

        <p className="text-[11px] text-muted text-center mt-3">
          Uploads resume automatically when a network is found.
        </p>

        <div className="mt-8 border-t border-neutral-100 pt-5">
          <h2 className="text-xl font-bold text-dark mb-3">Demo</h2>
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
