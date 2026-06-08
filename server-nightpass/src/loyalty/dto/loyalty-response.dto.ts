import { LoyaltyEventType } from '@prisma/client';

export interface LoyaltyStatusDto {
  totalPoints: number;
  yearPoints: number;
  streak: {
    current: number;
    longest: number;
    freezesRemaining: number;
    lastCheckinDate: string | null;
  };
}

export interface LoyaltyEventDto {
  id: string;
  type: LoyaltyEventType;
  points: number;
  multiplier: number;
  venueName: string | null;
  eventTitle: string | null;
  occurredAt: string;
}

export interface LeaderboardEntryDto {
  rank: number;
  userId: string;
  name: string;
  yearPoints: number;
}
