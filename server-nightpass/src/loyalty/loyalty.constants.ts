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
  REFERRAL_VISIT: 1, // link general: alguien abrió tu link (dedup por visitante)
  REFERRAL_SIGNUP: 5, // link general: tu invitado creó cuenta (1 vez por invitado)
  REFERRAL_VISIT_EVENT: 2, // link por evento: vale el doble (impulsa ventas)
  REFERRAL_SIGNUP_EVENT: 10, // link por evento: vale el doble
} as const;

export const MULTIPLIERS = {
  /** Viernes 20:00 → domingo 06:00 (MX timezone offset). */
  WEEKEND: 1.5,
  /** Birthday boost — full UTC day. */
  BIRTHDAY: 3.0,
} as const;

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
