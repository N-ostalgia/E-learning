export type Conversation = {
  id: string;
  userId1: string;
  userId2: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ConversationWithDetails = Conversation & {
  otherUser: {
    id: string;
    username: string;
    name: string;
    image: string | null;
  };
  lastMessage: Message | null;
  unreadCount: number;
  isBlocked: boolean;
  // true = you blocked them, false = they blocked you (or nobody's
  // blocked when isBlocked is also false). Lets the UI show which
  // direction it is instead of a generic "messaging unavailable".
  blockedByMe: boolean;
};

export type MessageWithSender = Message & {
  sender: {
    id: string;
    username: string;
    name: string;
    image: string | null;
  };
};

export type GetMessagesResult = {
  items: MessageWithSender[];
  nextCursor: string | null;
  isBlocked: boolean;
  blockedByMe: boolean;
};