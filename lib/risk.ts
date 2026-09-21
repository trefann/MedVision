export const IMAGE_WEIGHT = 0.7;
export const HABIT_WEIGHT = 0.3;
export const HIGH_HABIT = 7;

export interface Fused {
  combined: number;
  finalTier: 0 | 1 | 2;
  escalated: boolean;
  habit: number;
}

export function fuseRisk(imageTier: 0 | 1 | 2, probs: number[], habitScore: number): Fused {
  const severity = probs[1] * 0.5 + probs[2];
  const combined = IMAGE_WEIGHT * severity + HABIT_WEIGHT * (habitScore / 10);
  const finalTier = (imageTier === 1 && habitScore >= HIGH_HABIT ? 2 : imageTier) as 0 | 1 | 2;
  return { combined, finalTier, escalated: finalTier > imageTier, habit: habitScore };
}

export function recheckMonths(tier: 0 | 1 | 2, habitScore: number) {
  return tier === 0 ? (habitScore >= HIGH_HABIT ? 6 : 12) : null;
}
