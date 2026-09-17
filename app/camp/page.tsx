"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";

export default function CampPage() {
  const router = useRouter();
  const { campSession, patients, advanceCampQueue } = useStore();

  function handleStartScreening() {
    advanceCampQueue();
    router.push("/capture");
  }

  return (
    <PageTransition>
      <div className="bg-dark px-4 pt-3 pb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="text-white p-1 -ml-1">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-lg font-bold text-white">
              Camp — {campSession.location}
            </h1>
          </div>
          <span className="bg-danger/90 text-white text-[10px] font-bold px-2 py-1 rounded-full">
            {campSession.isOffline ? "Offline" : "Online"}
          </span>
        </div>

        <div className="flex gap-4 mt-2">
          <div className="flex-1 text-center">
            <p className="text-[11px] uppercase tracking-wider font-medium text-white/60">
              Screened today
            </p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-black text-white mt-1"
            >
              {campSession.screenedCount}
            </motion.p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-[11px] uppercase tracking-wider font-medium text-white/60">
              Avg time
            </p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl font-black text-white mt-1"
            >
              {campSession.avgTimeSeconds}
              <span className="text-lg font-bold text-white/60 ml-1">s</span>
            </motion.p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-4 bg-warm-white">
        <p className="text-[11px] uppercase tracking-wider font-medium text-muted mb-3">
          Waiting
        </p>
        <div className="space-y-2">
          {campSession.queue.map((item, i) => {
            const patient = patients.find((p) => p.id === item.patientId);
            return (
              <motion.div
                key={item.token}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between bg-white rounded-[20px] p-4 shadow-sm"
              >
                <p className="font-semibold text-dark text-sm">
                  Token {item.token} — {patient?.name || `Patient ${item.token}`}
                </p>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    item.type === "recheck"
                      ? "bg-warning text-white"
                      : "bg-neutral-100 text-dark"
                  }`}
                >
                  {item.type === "recheck" ? "Recheck" : "New"}
                </span>
              </motion.div>
            );
          })}
        </div>

        {campSession.queue.length > 0 ? (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleStartScreening}
            className="w-full mt-5 py-3.5 rounded-full bg-primary text-white font-bold text-sm"
          >
            Start next screening
          </motion.button>
        ) : (
          <p className="text-center text-muted text-sm mt-5">
            Queue empty. All patients screened.
          </p>
        )}
      </div>
    </PageTransition>
  );
}
