"use client";

import { ReactNode } from "react";

export default function PhoneFrame({ children, nav }: { children: ReactNode; nav?: ReactNode }) {
  return (
    <div className="h-dvh bg-dark flex items-center justify-center overflow-hidden">
      <div className="absolute w-[300px] h-[500px] bg-primary/20 rounded-full blur-[100px]" />

      <div className="relative w-[375px] h-[min(812px,calc(100dvh-16px))] max-w-full bg-warm-white rounded-[40px] overflow-hidden shadow-2xl border-[3px] border-neutral-800 flex flex-col">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-dark rounded-b-2xl z-50" />
        <div className="h-[48px] shrink-0" />
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {children}
        </div>
        {nav}
      </div>
    </div>
  );
}
