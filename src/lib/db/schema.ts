// src/lib/db/schema.ts
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ---------- App tables ----------

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  name: text("name").notNull(),
  image: text("image"),
  imageKey: text("image_key"),
  username: text("username").notNull().unique(),
  bio: text("bio"),
  website: text("website"),
  location: text("location"),
  github: text("github"),
  twitter: text("twitter"),
  linkedin: text("linkedin"),
  points: integer("points").notNull().default(0),
  level: integer("level").notNull().default(1),
  globalRole: text("global_role").notNull().default("member"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeAccountId: text("stripe_account_id"),
  stripeAccountStatus: text("stripe_account_status"),
  isPlatformSubscribed: integer("is_platform_subscribed", { mode: "boolean" })
    .notNull()
    .default(false),
  platformSubscriptionId: text("platform_subscription_id"),
  platformSubscriptionEnds: integer("platform_subscription_ends", { mode: "timestamp" }),
  previousRole: text("previous_role"),
  suspendedUntil: integer("suspended_until", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const platformSettings = sqliteTable("platform_settings", {
  id: text("id").primaryKey(),
  settings: text("settings").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const communities = sqliteTable("communities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
  category: text("category"),
  settings: text("settings"),
  price: integer("price"),
  stripePriceId: text("stripe_price_id"),
  stripeProductId: text("stripe_product_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const communityMembers = sqliteTable(
  "community_members",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    communityId: text("community_id")
      .notNull()
      .references(() => communities.id),
    role: text("role").notNull().default("member"),
    status: text("status").notNull().default("active"),
    joinedAt: integer("joined_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    userIdIdx: index("cm_user_id_idx").on(table.userId),
    communityIdIdx: index("cm_community_id_idx").on(table.communityId),
    roleIdx: index("cm_role_idx").on(table.role),
    joinedAtIdx: index("cm_joined_at_idx").on(table.joinedAt),
    statusIdx: index("cm_status_idx").on(table.status),
    communityUserIdx: uniqueIndex("cm_community_user_idx").on(
      table.communityId,
      table.userId
    ),
  })
);

// ---------- Feed tables ----------

export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    communityId: text("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    content: text("content").notNull(),
    type: text("type").notNull().default("post"),
    isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    postsCommunityIdIdx: index("posts_community_id_idx").on(table.communityId),
    postsAuthorIdIdx: index("posts_author_id_idx").on(table.authorId),
    postsCreatedAtIdx: index("posts_created_at_idx").on(table.createdAt),
  })
);

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentCommentId: text("parent_comment_id").references(
      (): AnySQLiteColumn => comments.id,
      {
        onDelete: "cascade",
      }
    ),
    content: text("content").notNull(),
    isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
    isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    commentsPostIdIdx: index("comments_post_id_idx").on(table.postId),
    commentsAuthorIdIdx: index("comments_author_id_idx").on(table.authorId),
  })
);

export const reports = sqliteTable(
  "reports",
  {
    id: text("id").primaryKey(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    reportsTargetIdx: index("reports_target_idx").on(table.targetId, table.targetType),
    reportsReporterIdx: index("reports_reporter_idx").on(table.reporterId),
    reportsStatusIdx: index("reports_status_idx").on(table.status),
  })
);

export const bookmarks = sqliteTable(
  "bookmarks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    bookmarksUserPostIdx: uniqueIndex("bookmarks_user_post_idx").on(table.userId, table.postId),
    bookmarksUserIdx: index("bookmarks_user_idx").on(table.userId),
    bookmarksPostIdx: index("bookmarks_post_idx").on(table.postId),
  })
);

export const mentions = sqliteTable(
  "mentions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    mentionsUserIdx: index("mentions_user_idx").on(table.userId),
    mentionsTargetIdx: index("mentions_target_idx").on(table.targetId, table.targetType),
  })
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // 'post' | 'comment' | 'reply' | 'mention' | 'like' | 'join' | 'request' | 'badge'
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    targetType: text("target_type"), // 'post' | 'comment' | 'community'
    targetId: text("target_id"),
    message: text("message").notNull(),
    link: text("link").notNull(),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    notifUserIdIdx: index("notif_user_id_idx").on(table.userId),
    notifIsReadIdx: index("notif_is_read_idx").on(table.isRead),
    notifCreatedAtIdx: index("notif_created_at_idx").on(table.createdAt),
  })
);

export const votes = sqliteTable(
  "votes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    value: integer("value").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    votesUserTargetIdx: uniqueIndex("votes_user_target_idx").on(
      table.userId,
      table.targetId,
      table.targetType
    ),
  })
);

// ---------- Payment tables ----------

export const platformSubscriptions = sqliteTable(
  "platform_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    status: text("status").notNull().default("active"),
    plan: text("plan").notNull().default("pro"),
    amount: integer("amount").notNull(),
    startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    platformSubUserIdIdx: index("platform_sub_user_id_idx").on(table.userId),
  })
);

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    communityId: text("community_id").notNull().references(() => communities.id),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    status: text("status").notNull().default("active"),
    amount: integer("amount").notNull(),
    startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    subsUserIdx: index("subscriptions_user_idx").on(table.userId),
    subsCommunityIdx: index("subscriptions_community_idx").on(table.communityId),
  })
);

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    communityId: text("community_id").references(() => communities.id),
    courseId: text("course_id").references(() => courses.id),
    amount: integer("amount").notNull(),
    platformFee: integer("platform_fee").notNull().default(0),
    creatorAmount: integer("creator_amount").notNull().default(0),
    currency: text("currency").notNull().default("usd"),
    status: text("status").notNull().default("pending"),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    subscriptionId: text("subscription_id").references(() => subscriptions.id),
    payoutId: text("payout_id"),
    paidAt: integer("paid_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    paymentsUserIdx: index("payments_user_idx").on(table.userId),
    paymentsCommunityIdx: index("payments_community_idx").on(table.communityId),
    paymentsCourseIdx: index("payments_course_idx").on(table.courseId),
  })
);

export const webhookEvents = sqliteTable("webhook_events", {
  id: text("id").primaryKey(),
  stripeEventId: text("stripe_event_id").notNull().unique(),
  type: text("type").notNull(),
  processedAt: integer("processed_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ---------- Better Auth tables ----------

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// ---------- Course tables ----------
export const courses = sqliteTable(
  "courses",
  {
    id: text("id").primaryKey(),
    communityId: text("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    price: integer("price").default(0),
    imageUrl: text("image_url"),
    imageKey: text("image_key"), // R2 key for the image
    isPublished: integer("is_published", { mode: "boolean" }).default(false),
    sortOrder: integer("sort_order").default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    communityIdIdx: index("courses_community_id_idx").on(table.communityId),
    publishedIdx: index("courses_published_idx").on(table.isPublished),
  })
);

export const lessons = sqliteTable(
  "lessons",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    content: text("content"), // Rich text content
    videoUrl: text("video_url"), // Public URL
    videoKey: text("video_key"), // R2 key for the video
    thumbnailUrl: text("thumbnail_url"),
    thumbnailKey: text("thumbnail_key"),
    order: integer("order").notNull().default(0),
    duration: integer("duration").default(0), // In seconds
    isFree: integer("is_free", { mode: "boolean" }).default(false),
    isPublished: integer("is_published", { mode: "boolean" }).default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    courseIdIdx: index("lessons_course_id_idx").on(table.courseId),
    orderIdx: index("lessons_order_idx").on(table.order),
  })
);

// ---------- Quiz tables ----------
export const quizzes = sqliteTable(
  "quizzes",
  {
    id: text("id").primaryKey(),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Quiz"),
    description: text("description"),
    passingScore: integer("passing_score").notNull().default(80), // Percentage
    timeLimit: integer("time_limit"), // Minutes, null = no limit
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    lessonIdIdx: index("quizzes_lesson_id_idx").on(table.lessonId),
  })
);

export const quizQuestions = sqliteTable(
  "quiz_questions",
  {
    id: text("id").primaryKey(),
    quizId: text("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    type: text("type").notNull().default("multiple_choice"), // multiple_choice, true_false
    options: text("options"), // JSON array of options
    correctAnswer: text("correct_answer").notNull(),
    explanation: text("explanation"),
    order: integer("order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    // NEW — only populated for AI-generated questions. Lets the frontend
    // render a real "jump to 05:45 in the video" control instead of a
    // string baked into `explanation`.
    sourceStartSeconds: integer("source_start_seconds"),
    sourceEndSeconds: integer("source_end_seconds"),
  },
  (table) => ({
    quizIdIdx: index("quiz_questions_quiz_id_idx").on(table.quizId),
  })
);

export const quizAttempts = sqliteTable(
  "quiz_attempts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    quizId: text("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    passed: integer("passed", { mode: "boolean" }).notNull().default(false),
    answers: text("answers"), // JSON string of answers
    startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }), 

  },
  (table) => ({
    userQuizIdx: index("quiz_attempts_user_quiz_idx").on(table.userId, table.quizId),
    userIdIdx: index("quiz_attempts_user_id_idx").on(table.userId),
    quizIdIdx: index("quiz_attempts_quiz_id_idx").on(table.quizId),
    attemptDateIdx: index("quiz_attempts_date_idx").on(table.createdAt),
  })
);
export const courseReviews = sqliteTable(
  "course_reviews",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1-5
    review: text("review"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    userCourseIdx: uniqueIndex("review_user_course_idx").on(table.userId, table.courseId),
    courseIdIdx: index("review_course_id_idx").on(table.courseId),
  })
);
export const courseEnrollments = sqliteTable(
  "course_enrollments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    progress: integer("progress").default(0),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    lastAccessedAt: integer("last_accessed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    userCourseIdx: uniqueIndex("enrollment_user_course_idx").on(table.userId, table.courseId),
    userIdIdx: index("enrollment_user_id_idx").on(table.userId),
    courseIdIdx: index("enrollment_course_id_idx").on(table.courseId),
  })
);

export const lessonProgress = sqliteTable(
  "lesson_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    lessonId: text("lesson_id").notNull().references(() => lessons.id),
    completed: integer("completed", { mode: "boolean" }).default(false),
    progressPercent: integer("progress_percent").default(0),
    videoWatchedPercent: integer("video_watched_percent").default(0), 
    quizPassed: integer("quiz_passed", { mode: "boolean" }).default(false), 
    watchedAt: integer("watched_at", { mode: "timestamp" }),
    startedAt: integer("started_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    videoCompleted: integer("video_completed", { mode: "boolean" }).default(false),

  },
  (table) => ({
    userLessonIdx: uniqueIndex("progress_user_lesson_idx").on(table.userId, table.lessonId),
    userIdIdx: index("progress_user_id_idx").on(table.userId),
    lessonIdIdx: index("progress_lesson_id_idx").on(table.lessonId),
  })
);

// Add to schema.ts

// ---------- Gamification / Points ----------
export const pointsActivity = sqliteTable(
  "points_activity",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    communityId: text("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    points: integer("points").notNull(), // positive = earned, negative = spent
    actionType: text("action_type").notNull(), // 'post', 'comment', 'like_received', 'like_given', 'join', etc.
    targetId: text("target_id"), // postId, commentId, etc.
    description: text("description"), // optional description
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    userIdIdx: index("pa_user_id_idx").on(table.userId),
    communityIdIdx: index("pa_community_id_idx").on(table.communityId),
    userIdCommunityIdx: index("pa_user_community_idx").on(table.userId, table.communityId),
    createdAtIdx: index("pa_created_at_idx").on(table.createdAt),
    // For fast leaderboard queries
    communityDateIdx: index("pa_community_date_idx").on(table.communityId, table.createdAt),
  })
);

// ---------- Events table ----------
export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    communityId: text("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    startDate: integer("start_date", { mode: "timestamp" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp" }),
    isFullDay: integer("is_full_day", { mode: "boolean" }).notNull().default(false),
    location: text("location"),
    color: text("color").default("#10b981"), // optional color for event badge
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    communityIdIdx: index("events_community_id_idx").on(table.communityId),
    startDateIdx: index("events_start_date_idx").on(table.startDate),
    createdByIdx: index("events_created_by_idx").on(table.createdBy),
  })
);

// ---------- Badges ----------
export const badges = sqliteTable(
  "badges",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    icon: text("icon").notNull(), // FontAwesome icon name, e.g., "faRocket"
    color: text("color").notNull().default("#10b981"),
    requirementType: text("requirement_type").notNull(), // 'posts', 'comments', 'likes_received', 'courses_completed', 'points', 'communities_created'
    requirementValue: integer("requirement_value").notNull(),
    isHidden: integer("is_hidden", { mode: "boolean" }).default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    reqTypeIdx: index("badges_req_type_idx").on(table.requirementType),
  })
);

export const userBadges = sqliteTable(
  "user_badges",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeId: text("badge_id")
      .notNull()
      .references(() => badges.id, { onDelete: "cascade" }),
    earnedAt: integer("earned_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    userBadgeUnique: uniqueIndex("user_badges_unique_idx").on(table.userId, table.badgeId),
    userIdIdx: index("user_badges_user_id_idx").on(table.userId),
    badgeIdIdx: index("user_badges_badge_id_idx").on(table.badgeId),
    earnedAtIdx: index("user_badges_earned_at_idx").on(table.earnedAt),
  })
);
// ---------- Messaging tables ----------
export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId1: text("user_id1")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userId2: text("user_id2")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastMessageAt: integer("last_message_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    userId1Idx: index("conv_user_id1_idx").on(table.userId1),
    userId2Idx: index("conv_user_id2_idx").on(table.userId2),
    uniquePair: uniqueIndex("conv_unique_pair_idx").on(table.userId1, table.userId2),
  })
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    readAt: integer("read_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    convIdx: index("msg_conv_id_idx").on(table.conversationId),
    senderIdx: index("msg_sender_id_idx").on(table.senderId),
    createdAtIdx: index("msg_created_at_idx").on(table.createdAt),
  })
);
// ---------- User moderation ----------
export const userReports = sqliteTable(
  "user_reports",
  {
    id: text("id").primaryKey(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reportedUserId: text("reported_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    details: text("details"),
    status: text("status").notNull().default("pending"), // pending | reviewed | dismissed | action_taken
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    reporterIdx: index("ur_reporter_idx").on(table.reporterId),
    reportedIdx: index("ur_reported_idx").on(table.reportedUserId),
    statusIdx: index("ur_status_idx").on(table.status),
  })
);

export const userBlocks = sqliteTable(
  "user_blocks",
  {
    id: text("id").primaryKey(),
    blockerId: text("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    blockerIdx: index("ub_blocker_idx").on(table.blockerId),
    blockedIdx: index("ub_blocked_idx").on(table.blockedId),
    uniqueBlock: uniqueIndex("ub_unique_idx").on(table.blockerId, table.blockedId),
  })
);
export const quizGenerationJobs = sqliteTable(
  "quiz_generation_jobs",
  {
    id: text("id").primaryKey(),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // pending | processing | completed | failed
    result: text("result"), // JSON string of generated quiz
    error: text("error"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    completedAt: integer("completed_at", { mode: "timestamp" }),
  },
  (table) => ({
    lessonIdIdx: index("qgj_lesson_id_idx").on(table.lessonId),
    userIdIdx: index("qgj_user_id_idx").on(table.userId),
    statusIdx: index("qgj_status_idx").on(table.status),
  })
);
// ---------- Relations ----------

export const usersRelations = relations(users, ({ many }) => ({
  communityMembers: many(communityMembers),
  posts: many(posts),
  comments: many(comments),
  votes: many(votes),
  platformSubscriptions: many(platformSubscriptions),
  subscriptions: many(subscriptions),
}));

export const communitiesRelations = relations(communities, ({ many }) => ({
  communityMembers: many(communityMembers),
  posts: many(posts),
  subscriptions: many(subscriptions),
}));

export const communityMembersRelations = relations(
  communityMembers,
  ({ one }) => ({
    user: one(users, {
      fields: [communityMembers.userId],
      references: [users.id],
    }),
    community: one(communities, {
      fields: [communityMembers.communityId],
      references: [communities.id],
    }),
  })
);

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  community: one(communities, {
    fields: [posts.communityId],
    references: [communities.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  user: one(users, {
    fields: [votes.userId],
    references: [users.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, {
    fields: [reports.reporterId],
    references: [users.id],
  }),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [bookmarks.postId],
    references: [posts.id],
  }),
}));

export const mentionsRelations = relations(mentions, ({ one }) => ({
  user: one(users, {
    fields: [mentions.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  actor: one(users, {
    fields: [notifications.actorId],
    references: [users.id],
  }),
}));

export const platformSubscriptionsRelations = relations(
  platformSubscriptions,
  ({ one }) => ({
    user: one(users, {
      fields: [platformSubscriptions.userId],
      references: [users.id],
    }),
  })
);

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  community: one(communities, {
    fields: [subscriptions.communityId],
    references: [communities.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  community: one(communities, {
    fields: [payments.communityId],
    references: [communities.id],
  }),
  subscription: one(subscriptions, {
    fields: [payments.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(users, {
    fields: [session.userId],
    references: [users.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(users, {
    fields: [account.userId],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  community: one(communities, {
    fields: [events.communityId],
    references: [communities.id],
  }),
  creator: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
}));

export const badgesRelations = relations(badges, ({ many }) => ({
  userBadges: many(userBadges),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, {
    fields: [userBadges.userId],
    references: [users.id],
  }),
  badge: one(badges, {
    fields: [userBadges.badgeId],
    references: [badges.id],
  }),
}));
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user1: one(users, { fields: [conversations.userId1], references: [users.id] }),
  user2: one(users, { fields: [conversations.userId2], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));
export const userReportsRelations = relations(userReports, ({ one }) => ({
  reporter: one(users, { fields: [userReports.reporterId], references: [users.id] }),
  reported: one(users, { fields: [userReports.reportedUserId], references: [users.id] }),
}));

export const userBlocksRelations = relations(userBlocks, ({ one }) => ({
  blocker: one(users, { fields: [userBlocks.blockerId], references: [users.id] }),
  blocked: one(users, { fields: [userBlocks.blockedId], references: [users.id] }),
}));