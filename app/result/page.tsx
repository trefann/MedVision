"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { MapPin, Bell, Volume2 } from "lucide-react";
import { useAnalysis } from "@/store/useAnalysis";
import { LANGS, STRINGS, findVoice } from "@/lib/i18n";

const BG = ["bg-success", "bg-warning", "bg-danger"];

export default function ResultPage() {
  const router = useRouter();
  const [playing, setPlaying] = useState(false);
  const analysis = useAnalysis((s) => s.result);
  const fused = useAnalysis((s) => s.fused);
  const tier = analysis ? (fused?.finalTier ?? analysis.tier) : 2;
  const lang = useAnalysis((s) => s.lang);
  const setLang = useAnalysis((s) => s.setLang);
  const t = STRINGS[lang];
  const [voiceMissing, setVoiceMissing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function stopAudio() {
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }

  useEffect(() => stopAudio, []);

  function changeLang(l: (typeof LANGS)[number]["code"]) {
    stopAudio();
    setPlaying(false);
    setVoiceMissing(false);
    setLang(l);
  }

  async function handlePlay() {
    stopAudio();
    if (lang !== "en") {
      const a = new Audio(`/audio/${lang}-${tier}.wav`);
      audioRef.current = a;
      a.onplay = () => setPlaying(true);
      a.onended = () => setPlaying(false);
      a.onerror = () => { setPlaying(false); setVoiceMissing(true); };
      try {
        await a.play();
        setVoiceMissing(false);
      } catch {
        setPlaying(false);
        setVoiceMissing(true);
      }
      return;
    }
    if (typeof speechSynthesis === "undefined") return setVoiceMissing(true);
    const voice = findVoice(lang);
    if (!voice) return setVoiceMissing(true);
    setVoiceMissing(false);
    const u = new SpeechSynthesisUtterance(t.spoken[tier]);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.9;
    u.onstart = () => setPlaying(true);
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    speechSynthesis.speak(u);
  }

  return (
    <PageTransition>
      <div className={`${BG[tier]} px-5 pt-8 pb-8`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">
            {t.yourResult}
          </p>
          <div className="flex gap-1" role="group" aria-label="Language">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => changeLang(l.code)}
                aria-pressed={lang === l.code}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  lang === l.code ? "bg-white text-dark" : "bg-white/20 text-white"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-black text-white leading-tight"
        >
          {t.headline[tier]}
        </motion.h1>
        <p className="text-white/70 text-sm mt-2">
          {t.delivered}
        </p>
      </div>

      <div className="px-4 pt-5 pb-4 bg-warm-white">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handlePlay}
          className="w-full py-3.5 rounded-full border-2 border-dark text-dark font-semibold text-sm flex items-center justify-center gap-2 mb-5"
        >
          <Volume2 size={16} className={playing ? "animate-pulse text-primary" : ""} />
          {playing ? t.playing : t.play}
        </motion.button>

        {voiceMissing && (
          <p className="text-xs font-semibold text-warning text-center -mt-3 mb-4">{lang === "en" ? t.noVoice : t.audioFail}</p>
        )}

        {playing && (
          <div className="flex items-center justify-center gap-1 mb-5 h-8">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-primary rounded-full"
                animate={{
                  height: [8, ((i * 7) % 17) + 14, 8],
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

        {tier === 2 && (
        <div className="bg-white rounded-[20px] p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider font-medium text-muted mb-1">
            {t.referredTo}
          </p>
          <p className="text-lg font-bold text-dark">
            {t.hospital}
          </p>
          <p className="text-sm text-muted">{t.dept}</p>
        </div>
        )}

        <div className="flex gap-3 mt-4">
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="flex-1 py-3.5 rounded-full border-2 border-dark text-dark font-semibold text-sm flex items-center justify-center gap-2"
          >
            <MapPin size={16} />
            {t.directions}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="flex-1 py-3.5 rounded-full border-2 border-dark text-dark font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Bell size={16} />
            {t.remind}
          </motion.button>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push("/dashboard")}
          className="w-full mt-4 py-3.5 rounded-full bg-dark text-white font-bold text-sm"
        >
          {t.done}
        </motion.button>
      </div>
    </PageTransition>
  );
}
