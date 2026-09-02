// src/server/modules/notification/notification.types.ts

export type NotificationType =
  | "post"
  | "comment"
  | "reply"
  | "mention"
  | "like"
  | "join"
  | "request"
  | "badge";

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  actorId: string | null;
  targetType: "post" | "comment" | "community" | "badge" | null;
  targetId: string | null;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
  actor?: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  } | null;
};

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  actorId?: string;
  targetType?: "post" | "comment" | "community" | "badge";
  targetId?: string;
  message: string;
  link: string;
};

export type ListNotificationsInput = {
  limit?: number;
  cursor?: string;
  filter?: "unread" | "all";
};

export type ListNotificationsResult = {
  items: Notification[];
  nextCursor: string | null;
};
