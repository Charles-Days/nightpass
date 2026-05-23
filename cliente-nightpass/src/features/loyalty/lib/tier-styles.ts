import type { LoyaltyTier } from '@/core/types/api';

export interface TierStyle {
  label: string;
  chipClass: string;
  gradient: string;
  description: string;
  perk: string;
}

export const TIER_STYLES: Record<LoyaltyTier, TierStyle> = {
  ROOKIE: {
    label: 'Rookie',
    chipClass: 'bg-white/[0.06] border-white/15 text-white/80',
    gradient: 'from-slate-700 to-slate-900',
    description: 'Tu primera noche',
    perk: 'Acceso al catálogo y rachas diarias.',
  },
  REGULAR: {
    label: 'Regular',
    chipClass:
      'bg-emerald-500/15 border-emerald-400/35 text-emerald-200',
    gradient: 'from-emerald-700 to-emerald-900',
    description: 'Sales seguido — vas en buen camino',
    perk: 'Acceso a tiers Regular y multiplicador weekend 1.5x.',
  },
  INSIDER: {
    label: 'Insider',
    chipClass:
      'bg-purple-500/15 border-purple-400/40 text-purple-200',
    gradient: 'from-purple-700 to-purple-900',
    description: 'Estás en los mejores eventos de la ciudad',
    perk: 'Acceso a tiers Insider y eventos exclusivos.',
  },
  VIP: {
    label: 'VIP',
    chipClass: 'bg-amber-400/15 border-amber-300/45 text-amber-200',
    gradient: 'from-amber-600 to-rose-700',
    description: 'Acceso total. Eres NightPass',
    perk: 'Acceso total: tiers VIP, sin filas, perks de venue.',
  },
};

export const TIER_ORDER: LoyaltyTier[] = ['ROOKIE', 'REGULAR', 'INSIDER', 'VIP'];
