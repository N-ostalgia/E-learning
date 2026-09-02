// src/server/modules/admin/admin.types.ts

export type ReportStatus = "pending" | "reviewed" | "dismissed";

export type ReportWithDetails = {
  id: string;
  reporterId: string;
  targetType: "post" | "comment";
  targetId: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: Date;
  reporter: {
    id: string;
    name: string;
    username: string;
    email: string;
    image: string | null;
  };
  target: {
    type: "post" | "comment";
    content: string;
    authorId: string;
    author: {
      id: string;
      name: string;
      username: string;
      email: string;
    };
    communityId?: string;
    community?: {
      id: string;
      name: string;
      slug: string;
    };
    postId?: string;
  };
};

export type UserWithStats = {
  id: string;
  email: string;
  username: string;
  name: string;
  image: string | null;
  globalRole: string;
  emailVerified: boolean;
  createdAt: Date;
  postCount: number;
  commentCount: number;
  communityCount: number;
  reportCount: number;
  isSuspended: boolean;
  suspendedUntil?: Date | null;
  previousRole?: string | null;
};

export type CommunityWithStats = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  ownerId: string;
  ownerName: string;
  ownerUsername: string;
  memberCount: number;
  postCount: number;
  isPublic: boolean;
  isSuspended: boolean;
  createdAt: Date;
};

export type PlatformStats = {
  totalUsers: number;
  totalCommunities: number;
  totalPosts: number;
  totalComments: number;
  totalReports: number;
  pendingReports: number;
  usersToday: number;
  communitiesToday: number;
  postsToday: number;
};

export type SettingsData = {
  platformName: string;
  platformTagline: string;
  supportEmail: string;
  allowRegistration: boolean;
  defaultUserRole: string;
  requireEmailVerification: boolean;
  usernameMinLength: number;
  usernameMaxLength: number;
  autoSuspendThreshold: number;
  postApprovalRequired: boolean;
  commentApprovalRequired: boolean;
  maxCommunitiesPerUser: number;
  defaultCommunityPrivacy: string;
  gamificationEnabled: boolean;
  pointsForPost: number;
  pointsForComment: number;
  pointsForLikeReceived: number;
  pointsForLessonComplete: number;
  stripeMode: string;
  platformFee: number;
  minimumPayout: number;
  welcomeEmailEnabled: boolean;
  notificationEmailEnabled: boolean;
  digestFrequency: string;
};