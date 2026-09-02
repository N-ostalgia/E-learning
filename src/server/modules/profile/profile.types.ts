// src/server/modules/profile/profile.types.ts
import type { users } from "@/lib/db/schema";

export type UserRow = typeof users.$inferSelect;

export type Profile = {
  id: string;
  userId: string;
  bio: string | null;
  avatarUrl: string | null;
  website: string | null;
  location: string | null;
  github: string | null;
  twitter: string | null;
  linkedin: string | null;
  updatedAt: Date;
  avatarKey: string | null;
};

export type UserProfile = {
  id: string;
  email?: string;
  username: string;
  name: string;
  image: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  github: string | null;
  twitter: string | null;
  linkedin: string | null;
  createdAt: Date;
  points: number;
  level: number;
  postCount: number;
  commentCount: number;
  communityCount: number;
  imageKey: string | null;
};

export type UpdateProfileInput = {
  bio?: string | null;
  avatarUrl?: string | null;
  website?: string | null;
  location?: string | null;
  github?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
  avatarKey?: string | null;
};

export type UserActivity = {
  id: string;
  type: "post" | "comment";
  content: string;
  communityName: string;
  communitySlug: string;
  createdAt: Date;
};

export type UserCommunity = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  memberCount: number;
  role: string;
  joinedAt: Date;
};

export type UserStats = {
  postCount: number;
  commentCount: number;
  communityCount: number;
  points: number;
  level: number;
};

