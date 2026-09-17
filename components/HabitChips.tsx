"use client";

import { TobaccoType } from "@/lib/types";

const HABIT_LABELS: Record<TobaccoType, string> = {
  gutkha: "Gutkha",
  khaini: "Khaini",
  betel_quid: "Betel quid",
  smoking: "Smoking",
};

interface HabitChipsProps {
  selected: TobaccoType[];
  onChange: (selected: TobaccoType[]) => void;
  readonly?: boolean;
}

export default function HabitChips({
  selected,
  onChange,
  readonly = false,
}: HabitChipsProps) {
  const allTypes: TobaccoType[] = ["gutkha", "khaini", "betel_quid", "smoking"];

  function toggle(type: TobaccoType) {
    if (readonly) return;
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allTypes.map((type) => {
        const isActive = selected.includes(type);
        return (
          <button
            key={type}
            onClick={() => toggle(type)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              isActive
                ? "bg-danger text-white"
                : "bg-transparent border-2 border-neutral-200 text-dark"
            } ${readonly ? "cursor-default" : "active:scale-95"}`}
          >
            {HABIT_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}
