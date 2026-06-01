export type Role =
  | 'ADMIN'
  | 'VENUE_OWNER'
  | 'VENUE_STAFF'
  | 'PROMOTER'
  | 'PROMOTER_STAFF'
  | 'RP'
  | 'CUSTOMER';

export type PromoterStatus = 'ACTIVE' | 'SUSPENDED';
export type PromoterMemberRole = 'OWNER' | 'STAFF';

export interface Promoter {
  id: string;
  slug: string;
  name: string;
  city: string;
  bio?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  instagram?: string | null;
  website?: string | null;
  status: PromoterStatus;
  platformFeePct?: number | null;
  cashCommissionExempt?: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { members: number };
}

export interface PromoterMe {
  promoter: Promoter;
  membershipRole: PromoterMemberRole;
}

export interface PromoterStaffMember {
  id: string;
  userId: string;
  promoterId: string;
  role: PromoterMemberRole;
  createdAt: string;
  user: { id: string; email: string; name: string | null; role: Role };
}

export interface PaginatedPromoters {
  items: Promoter[];
  total: number;
  page: number;
  limit: number;
}

/** Response when an admin creates a promoter. `temporaryPassword` is only
 *  present when a fresh owner account was created/promoted (sent by email). */
export interface CreatePromoterResponse {
  promoter: Promoter;
  temporaryPassword?: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt?: string;
  updatedAt?: string;
  mustChangePassword?: boolean;
  locationOnboardedAt?: string | null;
  state?: string | null;
  city?: string | null;
  phone?: string | null;
  rankingOptIn?: boolean | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface VenueApplication {
  id: string;
  applicantUserId: string;
  venueName: string;
  city: string;
  address: string | null;
  phone: string | null;
  message: string | null;
  status: ApplicationStatus;
  rejectionReason: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  applicant?: { id: string; name: string | null; email: string };
  reviewer?: { id: string; name: string | null; email: string } | null;
}

export interface PaginatedApplications {
  items: VenueApplication[];
  total: number;
  page: number;
  limit: number;
}

export type VenueStatus = 'ACTIVE' | 'SUSPENDED';

export interface Venue {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string | null;
  phone: string | null;
  status: VenueStatus;
  createdAt: string;
  updatedAt: string;
  owners?: Array<{
    user: { id: string; email: string; name: string | null; role: Role };
  }>;
  _count?: { owners: number; staff: number; events: number };
  description?: string | null;
  capacity?: number | null;
  priceFromCents?: number | null;
  currency?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  coverImageUrl?: string | null;
  categories?: string[];
  openHours?: Record<string, unknown> | null;
  events?: Event[];
  photos?: Array<{ id: string; url: string; position: number }>;
  menuUrl?: string | null;
  musicTypes?: string[];
  socialLinks?: Record<string, any> | null;
  dressCode?: string | null;
  minAge?: number | null;
  isFeatured?: boolean;
  featuredAt?: string | null;
  featuredReason?: string | null;
  platformFeePct?: number | null;
  cashCommissionExempt?: boolean;
}

export interface PaginatedVenues {
  items: Venue[];
  total: number;
  page: number;
  limit: number;
}

export interface UserSummary {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface UserDetail extends UserSummary {
  applications?: Array<{
    id: string;
    venueName: string;
    city: string;
    status: ApplicationStatus;
    createdAt: string;
    reviewedAt: string | null;
  }>;
  ownedVenues?: Array<{
    venue: {
      id: string;
      slug: string;
      name: string;
      city: string;
      status: VenueStatus;
    };
  }>;
  staffMemberships?: Array<{
    id: string;
    venueId: string;
    staffRole: VenueStaffRole;
    status: VenueStaffStatus;
    venue: { id: string; name: string; slug: string };
  }>;
}

export interface PaginatedUsers {
  items: UserSummary[];
  total: number;
  page: number;
  limit: number;
}

export type ApproveResponse = VenueApplication & { temporaryPassword: string };

export type PromoterExperience = '0' | '1-5' | '6-20' | '20+';

export interface PromoterApplication {
  id: string;
  applicantUserId: string;
  promoterName: string;
  city: string;
  phone: string | null;
  instagram: string | null;
  website: string | null;
  experience: PromoterExperience;
  eventTypes: string[];
  message: string | null;
  status: ApplicationStatus;
  rejectionReason: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  approvedPromoterId: string | null;
  createdAt: string;
  updatedAt: string;
  applicant?: { id: string; name: string | null; email: string };
  reviewer?: { id: string; name: string | null; email: string } | null;
}

export interface PaginatedPromoterApplications {
  items: PromoterApplication[];
  total: number;
  page: number;
  limit: number;
}

export type ApprovePromoterResponse = PromoterApplication & { temporaryPassword: string };

export type VenueStaffRole = 'MANAGER' | 'SCANNER';
export type VenueStaffStatus = 'PENDING' | 'ACTIVE' | 'REVOKED';

export interface VenueStaffMember {
  id: string;
  venueId: string;
  userId: string;
  staffRole: VenueStaffRole;
  status: VenueStaffStatus;
  invitedAt: string;
  joinedAt: string | null;
  user: { id: string; email: string; name: string | null; role: Role };
}

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELED';

/** Una subida de precio programada (sube `priceCents` al acercarse el evento). */
export interface TierPricePhase {
  priceCents: number;
  daysBeforeEvent: number;
}

export interface EventTier {
  id: string;
  eventId: string;
  name: string;
  priceCents: number;
  currency: string;
  capacity: number | null;
  position: number;
  minLoyaltyTier?: LoyaltyTier | null;
  /** Calendario de subidas (solo en lecturas del panel/owner). */
  prices?: TierPricePhase[];
  /** Próxima subida programada (solo en catálogo público). */
  nextPrice?: { priceCents: number; startsAt: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  venueId: string | null;
  promoterId?: string | null;
  externalVenueName?: string | null;
  externalVenueAddress?: string | null;
  externalVenueCity?: string | null;
  externalVenueLat?: number | null;
  externalVenueLng?: number | null;
  slug: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  coverImageUrl: string | null;
  flyerImageUrl: string | null;
  status: EventStatus;
  capacity: number | null;
  createdAt: string;
  updatedAt: string;
  tiers?: EventTier[];
  venue?: { id: string; slug: string; name: string; city: string; platformFeePct?: number } | null;
  promoter?: { id: string; slug: string; name: string; city: string; platformFeePct?: number } | null;
  isFeatured?: boolean;
  featuredAt?: string | null;
  featuredReason?: string | null;
  whatsappGroups?: WhatsappGroup[] | null;
}

/** Link a un grupo de WhatsApp del evento (lo agrega el organizador). */
export interface WhatsappGroup {
  label?: string | null;
  url: string;
}

export interface PaginatedEvents {
  items: Event[];
  total: number;
  page: number;
  limit: number;
}

export interface SignedUploadUrl {
  signedUrl: string;
  publicUrl: string;
}

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface Order {
  id: string;
  userId: string;
  eventId: string;
  tierId: string;
  status: OrderStatus;
  quantity: number;
  totalCents: number;
  applicationFeeCents: number;
  currency: string;
  stripePaymentIntentId: string | null;
  createdAt: string;
  updatedAt: string;
  passId?: string | null;
  eventTier?: { id: string; name: string; priceCents: number; currency: string };
  event?: { id: string; title: string; startsAt: string; venue?: { name: string; city: string } };
  pass?: { id: string };
}

export interface OrderHistoryItem {
  id: string;
  status: OrderStatus;
  totalCents: number;
  currency: string;
  stripePaymentIntentId: string | null;
  createdAt: string;
  tier?: { id: string; name: string; priceCents: number; currency: string } | null;
  event?: {
    id: string;
    title: string;
    startsAt: string;
    coverImageUrl: string | null;
    venue?: { id: string; name: string; slug: string } | null;
  } | null;
  pass?: { id: string; usedAt: string | null } | null;
}

export interface PaginatedOrders {
  items: OrderHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderCreationResponse {
  orderId: string;
  clientSecret: string;
  publishableKey?: string;
  totalCents: number;
  currency: string;
}

export interface CatalogTierDetail {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  capacity: number | null;
  nextPrice?: { priceCents: number; startsAt: string } | null;
  event: {
    id: string;
    slug: string;
    title: string;
    startsAt: string;
    endsAt: string;
    coverImageUrl: string | null;
    allowCashPayment?: boolean;
    venue: {
      id: string;
      slug: string;
      name: string;
      city: string;
    };
  };
  paymentsEnabled: boolean;
}

export interface Pass {
  id: string;
  orderId: string;
  userId: string;
  eventId: string;
  qrCode: string;
  usedAt: string | null;
  createdAt: string;
  event?: {
    id: string;
    title: string;
    startsAt: string;
    coverImageUrl: string | null;
    venue?: { id: string; name: string; city: string; address: string | null };
  };
  tier?: { id: string; name: string; priceCents: number; currency: string };
  transfers?: Array<{
    id: string;
    token: string;
    expiresAt: string;
    createdAt?: string;
  }>;
  /** Solo el comprador original puede transferir (no quien lo recibió). */
  canTransfer?: boolean;
  /** Motivo por el que no se puede transferir (ej. último boleto del evento). */
  transferBlockedReason?: string;
}

export type TransferStatus = 'PENDING' | 'CLAIMED' | 'CANCELLED' | 'EXPIRED';

export interface PassTransferCreated {
  token: string;
  expiresAt: string;
  transferId: string;
  alreadyExists: boolean;
}

export interface PassTransferPreview {
  status: TransferStatus;
  expired: boolean;
  isOwnPass: boolean;
  alreadyUsed: boolean;
  fromName: string | null;
  expiresAt: string;
  event: {
    id: string;
    title: string;
    startsAt: string;
    coverImageUrl: string | null;
    venue?: { name: string; city: string; address: string | null } | null;
  };
  tier?: { id: string; name: string } | null;
}

export interface PassTransferAccepted {
  passId: string;
  alreadyYours: boolean;
}

export interface PassClaimPreview {
  status: 'PENDING' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';
  expired: boolean;
  isFree: boolean;
  amountCents: number;
  currency: string;
  alreadyHasPass: boolean;
  expiresAt: string;
  event: {
    id: string;
    title: string;
    startsAt: string;
    coverImageUrl?: string | null;
    externalVenueName?: string | null;
    externalVenueCity?: string | null;
    venue: { name: string; city: string; address: string } | null;
  };
  tier: { id: string; name: string };
}

export interface PassClaimAccepted {
  passId: string;
  alreadyClaimed: boolean;
}

export interface CatalogVenueSummary {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string | null;
  description: string | null;
  coverImageUrl: string | null;
  categories: string[];
  musicTypes: string[];
  priceFromCents: number | null;
  currency: string | null;
  minAge: number | null;
  dressCode: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  openHours: Record<string, unknown> | null;
  photos?: Array<{ id: string; url: string; position: number }>;
}

export interface CatalogVenueDetail extends CatalogVenueSummary {
  phone: string | null;
  capacity: number | null;
  openHours: Record<string, unknown> | null;
  menuUrl: string | null;
  socialLinks: Record<string, unknown> | null;
  events: Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    startsAt: string;
    endsAt: string;
    coverImageUrl: string | null;
    tiers?: Array<{
      id: string;
      name: string;
      priceCents: number;
      currency: string;
      minLoyaltyTier?: LoyaltyTier | null;
    }>;
  }>;
}

export interface CatalogEventDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  coverImageUrl: string | null;
  flyerImageUrl: string | null;
  capacity: number | null;
  sold?: number | null;
  tiers: Array<{
    id: string;
    name: string;
    priceCents: number;
    currency: string;
    capacity: number | null;
    position: number;
    minLoyaltyTier?: LoyaltyTier | null;
    nextPrice?: { priceCents: number; startsAt: string } | null;
    upcomingPrices?: { priceCents: number; startsAt: string }[];
  }>;
  venue: {
    id: string;
    slug: string;
    name: string;
    city: string;
    address: string | null;
    coverImageUrl: string | null;
  } | null;
  promoter?: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
  } | null;
  externalVenueName?: string | null;
  externalVenueAddress?: string | null;
  externalVenueCity?: string | null;
  externalVenueLat?: number | null;
  externalVenueLng?: number | null;
  whatsappGroups?: WhatsappGroup[] | null;
}

export interface CatalogPromoterDetail {
  id: string;
  slug: string;
  name: string;
  city: string;
  bio: string | null;
  instagram: string | null;
  website: string | null;
  logoUrl: string | null;
  events: Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    startsAt: string;
    endsAt: string;
    coverImageUrl: string | null;
    capacity: number | null;
    externalVenueName: string | null;
    externalVenueCity: string | null;
    venue: {
      id: string;
      slug: string;
      name: string;
      city: string;
    } | null;
    tiers: Array<{
      id: string;
      name: string;
      priceCents: number;
      currency: string;
      capacity: number | null;
      minLoyaltyTier?: LoyaltyTier | null;
    }>;
  }>;
}

// ─── Loyalty / Streak / Tier ───────────────────────────────────────────────

export type LoyaltyTier = 'ROOKIE' | 'REGULAR' | 'INSIDER' | 'VIP';

export const LOYALTY_TIER_RANK: Record<LoyaltyTier, number> = {
  ROOKIE: 0,
  REGULAR: 1,
  INSIDER: 2,
  VIP: 3,
};

export type LoyaltyEventType =
  | 'EVENT_CHECKIN'
  | 'VENUE_CHECKIN'
  | 'FIRST_VENUE_BONUS'
  | 'STREAK_DAILY_BONUS'
  | 'STREAK_MILESTONE'
  | 'BRING_FRIEND_BONUS'
  | 'ADMIN_ADJUST';

export interface LoyaltyStreak {
  current: number;
  longest: number;
  freezesRemaining: number;
  lastCheckinDate: string | null;
}

export interface LoyaltyStatus {
  totalPoints: number;
  yearPoints: number;
  tier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  pointsToNext: number | null;
  streak: LoyaltyStreak;
}

export interface LoyaltyEntry {
  id: string;
  type: LoyaltyEventType;
  points: number;
  multiplier: number;
  venueName: string | null;
  eventTitle: string | null;
  occurredAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string | null;
  tier: LoyaltyTier;
  yearPoints: number;
}

export interface VenueCheckinResponse {
  awarded: number;
  newStreakDays: number;
  tier: LoyaltyTier;
  alreadyCheckedInToday?: boolean;
}

export interface VenueCheckinQrPayload {
  payload: string;
  /** URL form for native camera apps: opens the customer web flow,
   *  which redirects to login if needed and auto-processes the check-in. */
  scanUrl: string;
  issuedAt: string;
}

export interface PassesStatsDailyPoint {
  day: string;
  sales: number;
  revenue: number;
}

export interface PassesStatsEventRow {
  eventId: string;
  title: string;
  startsAt: string;
  capacity: number | null;
  vendidos: number;
  vendidosAdmin?: number;
  ingresosAdmin?: number;
  canjeados: number;
  ingresos: number;
}

export interface PassesStats {
  totalRevenue: number;
  totalFees: number;
  passesSold: number;
  passesSoldAdmin?: number;
  revenueAdmin?: number;
  passesRedeemed: number;
  passesPending: number;
  redeemRate: number;
  upcomingEvent: {
    id: string;
    title: string;
    startsAt: string;
    vendidos: number;
  } | null;
  dailySeries: PassesStatsDailyPoint[];
  byEvent: PassesStatsEventRow[];
  range: { from: string; to: string };
}

export interface EventTierBreakdownTier {
  tierId: string;
  name: string;
  priceCents: number;
  currency: string;
  capacity: number | null;
  sold: number;
}

export interface EventTierBreakdownOrder {
  id: string;
  userEmail: string;
  userName: string | null;
  tierName: string;
  totalCents: number;
  createdAt: string;
  passUsed: boolean;
}

export interface EventTierBreakdown {
  eventId: string;
  title: string;
  startsAt: string;
  tiers: EventTierBreakdownTier[];
  orders: EventTierBreakdownOrder[];
}

// ─── Admin Finance (panel global) ──────────────────────────────────────────

export interface AdminFinanceTotals {
  grossCents: number;
  platformFeeCents: number;
  stripeFeeEstCents: number;
  netToVenuesCents: number;
  rpCommissionsCents: number;
  ordersCount: number;
  passesSold: number;
  passesSoldAdmin?: number;
  revenueAdmin?: number;
  passesRedeemed: number;
  /** 0..1 */
  redeemRate: number;
  refundedCount: number;
  refundedAmountCents: number;
  failedCount: number;
  avgTicketCents: number;
}

export interface AdminFinanceEventRow {
  eventId: string;
  title: string;
  startsAt: string | null;
  venueName: string | null;
  capacity: number | null;
  vendidos: number;
  vendidosAdmin?: number;
  ingresosAdmin?: number;
  canjeados: number;
  grossCents: number;
  platformFeeCents: number;
  ordersCount: number;
}

export interface AdminFinanceVenueRow {
  venueId: string;
  name: string;
  grossCents: number;
  platformFeeCents: number;
  ordersCount: number;
}

export interface AdminFinancePromoterRow {
  promoterId: string;
  name: string;
  grossCents: number;
  platformFeeCents: number;
  ordersCount: number;
}

export interface AdminFinanceRpRow {
  rpId: string;
  displayName: string;
  rpCode: string;
  salesCount: number;
  earningsCents: number;
}

export interface AdminFinanceDailyPoint {
  /** YYYY-MM-DD */
  day: string;
  sales: number;
  grossCents: number;
  platformFeeCents: number;
}

export interface AdminFinanceStripeHealth {
  venuesConnected: number;
  venuesTotal: number;
  promotersConnected: number;
  promotersTotal: number;
}

export interface AdminFinanceFeeAssumptions {
  stripePct: number;
  stripeFixedCents: number;
  platformFeePctDefault: number;
}

export interface VisitorStats {
  today: number;
  allTime: number;
  last7: { date: string; count: number }[];
}

export interface AdminFinanceStats {
  range: { from: string; to: string };
  totals: AdminFinanceTotals;
  /** ordenado por grossCents desc */
  byEvent: AdminFinanceEventRow[];
  topVenues: AdminFinanceVenueRow[];
  topPromoters: AdminFinancePromoterRow[];
  topRps: AdminFinanceRpRow[];
  dailySeries: AdminFinanceDailyPoint[];
  stripeHealth: AdminFinanceStripeHealth;
  feeAssumptions: AdminFinanceFeeAssumptions;
}

export type StoryMediaType = 'IMAGE' | 'VIDEO';

export interface Story {
  id: string;
  venueId: string;
  createdById: string;
  mediaUrl: string;
  mediaType: StoryMediaType;
  durationMs: number | null;
  caption: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface StoryUploadInit {
  signedUrl: string;
  publicUrl: string;
  key: string;
}

export interface VenueStoriesGroup {
  /** `venue` = anchor por local · `promoter` = anchor por organizador (eventos sin venue). */
  kind?: 'venue' | 'promoter';
  /** ID del venue o promoter — usado solo como key de React. */
  venueId: string;
  /** Slug del venue o promoter (usar `kind` para decidir ruta). */
  venueSlug: string;
  /** Nombre para mostrar en el ring. */
  venueName: string;
  /** Cover del venue o logo del promoter. */
  venueCoverImageUrl: string | null;
  stories: Story[];
}
