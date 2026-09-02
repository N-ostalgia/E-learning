import type { communities, communityMembers } from "@/lib/db/schema";

export type Community = typeof communities.$inferSelect;
export type CommunityMember = typeof communityMembers.$inferSelect;
export type NewCommunity = typeof communities.$inferInsert;
export type NewCommunityMember = typeof communityMembers.$inferInsert;

export type CommunityWithMemberCount = Omit<Community, "createdAt" | "updatedAt"> & {
  createdAt: Date | string | number;
  updatedAt: Date | string | number;
  memberCount: number;
  isMember: boolean;
  membershipRole?: string | null;
  membershipStatus?: string | null;
};

export type CommunityMemberInfo = {
  id: string;
  name: string;
  username: string;
  image: string | null;
  bio: string | null;
  role: string;
  joinedAt: Date | string | number;
};

// Restricted shape returned to non-members — only preview fields present.
// Member-only fields are optional so the type covers both branches safely.
export type CommunityDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  ownerUsername?: string | null;
  isPublic: boolean;
  price?: number | null;
  memberCount: number;
  isMember: boolean;
  isOwner: boolean;
  membership?: { role: string; status: string } | null;
  coverUrl?: string | null;
  category?: string | null;
  settings?: string | null;
  createdAt?: Date | string | number;
  updatedAt?: Date | string | number;
};

export type ListCommunitiesInput = {
  limit: number;
  cursor?: string | null;
  search?: string | null;
  category?: string | null;
};

export type CreateCommunityInput = {
  name: string;
  description?: string;
  isPublic: boolean;
  price?: number | null;
  category?: string | null;
};