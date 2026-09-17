"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import StatusBadge from "./StatusBadge";

interface PatientCardProps {
  id: string;
  name: string;
  age: number;
  subtitle: string;
  status: string;
}

export default function PatientCard({
  id,
  name,
  age,
  subtitle,
  status,
}: PatientCardProps) {
  return (
    <Link href={`/patients/${id}`}>
      <div className="flex items-center gap-3 bg-white rounded-[20px] p-4 shadow-sm active:scale-[0.98] transition-transform">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
          {name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-dark text-[15px]">
            {name}, {age}
          </p>
          <p className="text-xs text-muted truncate">{subtitle}</p>
        </div>
        <StatusBadge status={status} size="sm" />
        <ChevronRight size={16} className="text-muted" />
      </div>
    </Link>
  );
}
