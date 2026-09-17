"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, WifiOff } from "lucide-react";

interface TopBarProps {
  title: string;
  showBack?: boolean;
  showOffline?: boolean;
  transparent?: boolean;
  light?: boolean;
}

export default function TopBar({
  title,
  showBack = false,
  showOffline = false,
  transparent = false,
  light = false,
}: TopBarProps) {
  const router = useRouter();
  const textColor = light ? "text-white" : "text-dark";

  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 ${
        transparent ? "" : "bg-warm-white"
      }`}
    >
      {showBack && (
        <button
          onClick={() => router.back()}
          className={`p-1 -ml-1 ${textColor}`}
        >
          <ChevronLeft size={24} />
        </button>
      )}
      <h1 className={`text-lg font-bold flex-1 ${textColor}`}>{title}</h1>
      {showOffline && (
        <div className="flex items-center gap-1.5 bg-danger/10 text-danger px-2.5 py-1 rounded-full text-xs font-semibold">
          <WifiOff size={12} />
          Offline
        </div>
      )}
    </div>
  );
}
