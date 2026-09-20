export const IMAGE_WEIGHT = 0.7;
export const HABIT_WEIGHT = 0.3;
export const MONITOR_AT = 0.35;
export const REFER_AT = 0.6;

export interface Fused {
  combined: number;
  finalTier: 0 | 1 | 2;
  escalated: boolean;
}

export function fuseRisk(imageTier: 0 | 1 | 2, probs: number[], habitScore: number): Fused {
  const severity = probs[1] * 0.5 + probs[2];
  const combined = IMAGE_WEIGHT * severity + HABIT_WEIGHT * (habitScore / 10);
  const fromScore: 0 | 1 | 2 = combined >= REFER_AT ? 2 : combined >= MONITOR_AT ? 1 : 0;
  const finalTier = Math.max(imageTier, fromScore) as 0 | 1 | 2;
  return { combined, finalTier, escalated: finalTier > imageTier };
}
