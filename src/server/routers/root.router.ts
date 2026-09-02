// src/server/routers/root.router.ts
import { router } from "@/server/trpc/trpc";
import { authRouter } from "@/server/modules/auth/auth.router";
import { communityRouter } from "@/server/modules/community/community.router";
import { feedRouter } from "@/server/modules/feed/feed.router";
import { profileRouter } from "@/server/modules/profile/profile.router";
import { notificationRouter } from "@/server/modules/notification/notification.router";
import { adminRouter } from "@/server/modules/admin/admin.router";
import { paymentRouter } from "@/server/modules/payment/payment.router";
import {courseRouter} from "@/server/modules/course/course.router";
import { quizRouter } from "@/server/modules/quiz/quiz.router";
import { reviewRouter } from "@/server/modules/course/review.router";
import { membersRouter } from "../modules/community/members.router";
import { leaderboardRouter } from "../modules/community/leaderboard.router";
import { eventRouter } from "../modules/event/event.router";
import { badgeRouter } from "../modules/badge/badge.router";
import { messageRouter } from "../modules/message/message.router";
import { userRouter } from "../modules/user/user.router";
import { aiRouter } from "../modules/ai/ai.router";

export const appRouter = router({
  auth: authRouter,
  community: communityRouter,
  feed: feedRouter,
  profile: profileRouter,
  notification: notificationRouter,
  payment: paymentRouter,
  admin: adminRouter,
  course: courseRouter,
  quiz: quizRouter,
  review: reviewRouter,
  members: membersRouter,
  leaderboard: leaderboardRouter,
  event: eventRouter,
  badge: badgeRouter,
  message: messageRouter,
  user: userRouter,
  ai: aiRouter,

});

export type AppRouter = typeof appRouter;
