import { LoyaltyTier } from '@prisma/client';

/**
 * Base point awards before multipliers.
 */
export const POINTS = {
  EVENT_CHECKIN: 25, // staff scaneó pass del user
  VENUE_CHECKIN: 10, // user scaneó QR estático
  FIRST_VENUE_BONUS: 15, // primer check-in histórico en ese venue
  STREAK_DAILY_BONUS: 5, // por día consecutivo (≥2 días)
  STREAK_MILESTONE_7: 50,
  STREAK_MILESTONE_30: 200,
  STREAK_MILESTONE_100: 500,
  STREAK_MILESTONE_365: 1000,
  BRING_FRIEND_BONUS: 20, // fase 4
} as const;

export const MULTIPLIERS = {
  /** Viernes 20:00 → domingo 06:00 (MX timezone offset). */
  WEEKEND: 1.5,
  /** Birthday boost — full UTC day. */
  BIRTHDAY: 3.0,
} as const;

/**
 * Year-points thresholds for each tier (sliding 365-day window).
 */
export const TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  ROOKIE: 0,
  REGULAR: 500,
  INSIDER: 2000,
  VIP: 5000,
};

/**
 * Ordinal ranks used to compare tiers (e.g. user.tier >= eventTier.minLoyaltyTier).
 */
export const TIER_RANK: Record<LoyaltyTier, number> = {
  ROOKIE: 0,
  REGULAR: 1,
  INSIDER: 2,
  VIP: 3,
};

export const STREAK = {
  FREEZES_PER_MONTH: 2,
  /** Geofence tolerance (m) added to venue radius for venue check-in. */
  VENUE_CHECKIN_GPS_TOLERANCE_M: 50,
} as const;

/**
 * Streak milestone days → bonus points.
 */
export const STREAK_MILESTONES: Array<{ days: number; bonus: number }> = [
  { days: 7, bonus: POINTS.STREAK_MILESTONE_7 },
  { days: 30, bonus: POINTS.STREAK_MILESTONE_30 },
  { days: 100, bonus: POINTS.STREAK_MILESTONE_100 },
  { days: 365, bonus: POINTS.STREAK_MILESTONE_365 },
];

/**
 * Resolve the tier for a given yearPoints total.
 */
export function tierFromYearPoints(yearPoints: number): LoyaltyTier {
  if (yearPoints >= TIER_THRESHOLDS.VIP) return 'VIP';
  if (yearPoints >= TIER_THRESHOLDS.INSIDER) return 'INSIDER';
  if (yearPoints >= TIER_THRESHOLDS.REGULAR) return 'REGULAR';
  return 'ROOKIE';
}

/**
 * Resolve the next tier above the given one, or null if already at the top.
 */
export function nextTier(tier: LoyaltyTier): LoyaltyTier | null {
  if (tier === 'ROOKIE') return 'REGULAR';
  if (tier === 'REGULAR') return 'INSIDER';
  if (tier === 'INSIDER') return 'VIP';
  return null;
}
