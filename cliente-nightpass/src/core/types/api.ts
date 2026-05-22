export type Role = 'ADMIN' | 'VENUE_OWNER' | 'VENUE_STAFF' | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt?: string;
  updatedAt?: string;
  mustChangePassword?: boolean;
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

export interface EventTier {
  id: string;
  eventId: string;
  name: string;
  priceCents: number;
  currency: string;
  capacity: number | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  venueId: string;
  slug: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  coverImageUrl: string | null;
  status: EventStatus;
  capacity: number | null;
  createdAt: string;
  updatedAt: string;
  tiers?: EventTier[];
  venue?: { id: string; slug: string; name: string; city: string };
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

export interface OrderCreationResponse {
  orderId: string;
  clientSecret: string;
  publishableKey?: string;
  totalCents: number;
  currency: string;
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
    tiers?: Array<{ id: string; name: string; priceCents: number; currency: string }>;
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
  capacity: number | null;
  tiers: Array<{
    id: string;
    name: string;
    priceCents: number;
    currency: string;
    capacity: number | null;
    position: number;
  }>;
  venue: {
    id: string;
    slug: string;
    name: string;
    city: string;
    address: string | null;
    coverImageUrl: string | null;
  };
}
