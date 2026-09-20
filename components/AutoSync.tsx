"use client";

import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import { pendingCounts, syncNow } from "@/lib/sync";

export default function AutoSync() {
  useEffect(() => {
    const resume = () => {
      const s = useStore.getState();
      if (s.syncedAt && pendingCounts(s).total > 0) void syncNow();
    };
    window.addEventListener("online", resume);
    return () => window.removeEventListener("online", resume);
  }, []);
  return null;
}
