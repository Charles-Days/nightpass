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
