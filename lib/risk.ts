export const HIGH_HABIT = 7;

export interface Fused {
  finalTier: 0 | 1 | 2;
  escalated: boolean;
  habit: number;
}

export function fuseRisk(imageTier: 0 | 1 | 2, habitScore: number): Fused {
  const finalTier = (imageTier === 1 && habitScore >= HIGH_HABIT ? 2 : imageTier) as 0 | 1 | 2;
  return { finalTier, escalated: finalTier > imageTier, habit: habitScore };
}

export function recheckMonths(tier: 0 | 1 | 2, habitScore: number) {
  return tier === 0 ? (habitScore >= HIGH_HABIT ? 6 : 12) : null;
}
