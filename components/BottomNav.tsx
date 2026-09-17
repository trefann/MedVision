"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Camera, Users, Settings } from "lucide-react";

const tabs = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/capture", icon: Camera, label: "Capture" },
  { href: "/patients", icon: Users, label: "Patients" },
  { href: "/sync", icon: Settings, label: "Settings" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="shrink-0 bg-white border-t border-neutral-100 px-2 pb-2 pt-1">
      <div className="flex justify-around">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                isActive ? "text-primary" : "text-muted"
              }`}
            >
              <tab.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span
                className={`text-[10px] tracking-wide ${
                  isActive ? "font-semibold" : "font-medium"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
