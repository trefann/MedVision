"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { MapPin, Bell, Volume2 } from "lucide-react";

export default function ResultPage() {
  const router = useRouter();
  const [playing, setPlaying] = useState(false);

  function handlePlay() {
    setPlaying(true);
    setTimeout(() => setPlaying(false), 3000);
  }

  return (
    <PageTransition>
      <div className="bg-danger px-5 pt-8 pb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">
            Your result
          </p>
          <span className="text-white/60 text-xs">Tamil</span>
        </div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-black text-white leading-tight"
        >
          See a doctor within 7 days
        </motion.h1>
        <p className="text-white/70 text-sm mt-2">
          Delivered as audio in the local language
        </p>
      </div>

      <div className="px-4 pt-5 pb-4 bg-warm-white">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handlePlay}
          className="w-full py-3.5 rounded-full border-2 border-dark text-dark font-semibold text-sm flex items-center justify-center gap-2 mb-5"
        >
          <Volume2 size={16} className={playing ? "animate-pulse text-primary" : ""} />
          {playing ? "Playing..." : "Play spoken explanation"}
        </motion.button>

        {playing && (
          <div className="flex items-center justify-center gap-1 mb-5 h-8">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-primary rounded-full"
                animate={{
                  height: [8, Math.random() * 24 + 8, 8],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.05,
                }}
              />
            ))}
          </div>
        )}

        <div className="bg-white rounded-[20px] p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider font-medium text-muted mb-1">
            Referred to
          </p>
          <p className="text-lg font-bold text-dark">
            Govt. Hospital, Chengalpattu
          </p>
          <p className="text-sm text-muted">Dental OPD · Tue and Thu</p>
        </div>

        <div className="flex gap-3 mt-4">
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="flex-1 py-3.5 rounded-full border-2 border-dark text-dark font-semibold text-sm flex items-center justify-center gap-2"
          >
            <MapPin size={16} />
            Directions
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="flex-1 py-3.5 rounded-full border-2 border-dark text-dark font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Bell size={16} />
            Remind me
          </motion.button>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push("/dashboard")}
          className="w-full mt-4 py-3.5 rounded-full bg-dark text-white font-bold text-sm"
        >
          Done
        </motion.button>
      </div>
    </PageTransition>
  );
}
