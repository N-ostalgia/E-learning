import type { Badge } from "@/server/modules/badge/badge.types";

export const BADGE_DEFINITIONS: Omit<Badge, "id" | "createdAt" | "updatedAt" | "isHidden">[] = [
  // Posts
  {
    name: "First Steps",
    description: "Create your first post",
    icon: "faRocket",
    color: "#10b981",
    requirementType: "posts",
    requirementValue: 1,
  },
  {
    name: "Active Member",
    description: "Create 50 posts",
    icon: "faFire",
    color: "#f59e0b",
    requirementType: "posts",
    requirementValue: 50,
  },
  {
    name: "Super Contributor",
    description: "Create 100 posts",
    icon: "faStar",
    color: "#8b5cf6",
    requirementType: "posts",
    requirementValue: 100,
  },
  // Comments
  {
    name: "Commentator",
    description: "Leave 10 comments",
    icon: "faComment",
    color: "#3b82f6",
    requirementType: "comments",
    requirementValue: 10,
  },
  {
    name: "Top Commentator",
    description: "Leave 100 comments",
    icon: "faComments",
    color: "#6366f1",
    requirementType: "comments",
    requirementValue: 100,
  },
  // Likes received
  {
    name: "Popular Creator",
    description: "Get 50 likes on your content",
    icon: "faHeart",
    color: "#ef4444",
    requirementType: "likes_received",
    requirementValue: 50,
  },
  {
    name: "Influencer",
    description: "Get 200 total likes",
    icon: "faThumbsUp",
    color: "#ec4899",
    requirementType: "likes_received",
    requirementValue: 200,
  },
  // Courses completed
  {
    name: "Course Enthusiast",
    description: "Complete 1 course",
    icon: "faGraduationCap",
    color: "#14b8a6",
    requirementType: "courses_completed",
    requirementValue: 1,
  },
  {
    name: "Course Master",
    description: "Complete 5 courses",
    icon: "faTrophy",
    color: "#fbbf24",
    requirementType: "courses_completed",
    requirementValue: 5,
  },
  // Points
  {
    name: "Rising Star",
    description: "Reach 100 points",
    icon: "faMedal",
    color: "#f59e0b",
    requirementType: "points",
    requirementValue: 100,
  },
  {
    name: "Top Performer",
    description: "Reach 1000 points",
    icon: "faCrown",
    color: "#eab308",
    requirementType: "points",
    requirementValue: 1000,
  },
  {
    name: "Legend",
    description: "Reach 5000 points",
    icon: "faGem",
    color: "#8b5cf6",
    requirementType: "points",
    requirementValue: 5000,
  },
  // Communities created
  {
    name: "Community Builder",
    description: "Create 1 community",
    icon: "faUsers",
    color: "#06b6d4",
    requirementType: "communities_created",
    requirementValue: 1,
  },
  {
    name: "Community Leader",
    description: "Create 3 communities",
    icon: "faUsersCog",
    color: "#8b5cf6",
    requirementType: "communities_created",
    requirementValue: 3,
  },
];