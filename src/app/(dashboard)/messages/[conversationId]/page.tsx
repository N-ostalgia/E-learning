"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faUser,
  faPaperPlane,
  faSpinner,
  faCircle,
  faMessage,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { toast } from "sonner";

function formatDayDivider(date: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDay.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState<boolean | null>(null);
  const [isUnblocking, setIsUnblocking] = useState(false);

  const { data: session } = trpc.auth.getSession.useQuery();
  const userId = session?.user?.id;
  const { socket, isConnected } = useWebSocket(userId);

  const markAllReadMutation = trpc.message.markAllRead.useMutation();

  const { data: conversations, refetch: refetchConversations } =
    trpc.message.getConversations.useQuery(undefined, { enabled: !!userId });

  const conversation = conversations?.find((c) => c.id === conversationId);
  const otherUser = conversation?.otherUser;
  const isConvBlocked = conversation?.isBlocked || false;

  const {
    data: messagesData,
    isLoading: messagesLoading,
    isError: messagesError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.message.getMessages.useInfiniteQuery(
    {
      conversationId,
      limit: 30,
    },
    {
      enabled: !!conversationId && !!userId,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  useEffect(() => {
    if (messagesData?.pages?.[0]) {
      setIsBlocked(messagesData.pages[0].isBlocked || isConvBlocked);
      setBlockedByMe(messagesData.pages[0].blockedByMe ?? null);
    } else {
      setIsBlocked(isConvBlocked);
      setBlockedByMe(conversation?.blockedByMe ?? null);
    }
  }, [messagesData, isConvBlocked, conversation]);

  const sendMessageMutation = trpc.message.sendMessage.useMutation({
    onSuccess: () => {
      setNewMessage("");
      setIsSending(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
      setIsSending(false);
    },
  });

  const messages = (messagesData?.pages.flatMap((p) => p.items) || []).reverse();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handler = (event: CustomEvent) => {
      const data = event.detail;
      if (data.conversationId === conversationId) {
        refetch();
      }
    };
    window.addEventListener("new_message", handler as EventListener);
    return () => window.removeEventListener("new_message", handler as EventListener);
  }, [conversationId, refetch]);

  useEffect(() => {
    if (conversationId && userId && !isBlocked) {
      markAllReadMutation.mutate({ conversationId });
    }
  }, [conversationId, userId, isBlocked]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [newMessage]);

  const submitMessage = () => {
    if (isBlocked) {
      toast.error("You can't send messages in this conversation.");
      return;
    }
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);

    if (socket && isConnected) {
      socket.emit(
        "send_message",
        {
          conversationId,
          content: newMessage.trim(),
        },
        (response: { success: boolean; error?: string }) => {
          if (!response.success) {
            toast.error(response.error || "Failed to send");
          }
          setIsSending(false);
          refetch();
        }
      );
    } else {
      sendMessageMutation.mutate({
        conversationId,
        content: newMessage.trim(),
      });
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  };

  const unblockMutation = trpc.message.unblockUser.useMutation({
    onSuccess: () => {
      toast.success(`Unblocked ${otherUser?.name || otherUser?.username}.`);
      refetchConversations();
      setIsUnblocking(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to unblock.");
      setIsUnblocking(false);
    },
  });

  const handleUnblock = () => {
    if (!otherUser) return;
    setIsUnblocking(true);
    unblockMutation.mutate({ userId: otherUser.id });
  };

  if (!conversation || !otherUser) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-4">
        <div className="h-12 animate-pulse rounded bg-[var(--color-border)]" />
        <div className="h-96 animate-pulse rounded-xl bg-[var(--color-border)]" />
      </div>
    );
  }

  let lastDividerKey = "";

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            aria-label="Back to messages"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="h-5 w-5" />
          </button>
          <Link href={`/profile/${otherUser.username}`} className="flex items-center gap-3">
            <div
              className={`relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full ${
                isBlocked ? "grayscale" : ""
              }`}
            >
              {otherUser.image ? (
                <img src={otherUser.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                  <FontAwesomeIcon icon={faUser} className="h-5 w-5" />
                </div>
              )}
            </div>
            <span className="font-medium text-[var(--color-text-primary)]">
              {otherUser.name || otherUser.username}
            </span>
          </Link>
        </div>

        {!isConnected && (
          <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            <FontAwesomeIcon icon={faCircle} className="h-1.5 w-1.5 animate-pulse text-current" />
            Connecting...
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-1 overflow-y-auto py-4">
        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mx-auto mb-2 flex items-center gap-1.5 text-sm text-[var(--color-accent)] hover:underline disabled:opacity-50"
          >
            {isFetchingNextPage ? (
              <span className="h-4 w-20 animate-pulse rounded bg-[var(--color-border)]" aria-label="Loading more messages" />
            ) : "Load more"}
          </button>
        )}

        {messagesLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-[var(--color-border)]" />
            ))}
          </div>
        )}
        {messagesError && (
          <p className="py-8 text-center text-sm text-red-600">Failed to load messages.</p>
        )}
        {!messagesLoading && !messagesError && messages.length === 0 && !hasNextPage && !isBlocked && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-[var(--color-accent-soft)] p-3">
              <FontAwesomeIcon icon={faMessage} className="h-6 w-6 text-[var(--color-accent)]" />
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              No messages yet — say hi to {otherUser.name || otherUser.username}.
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.senderId === userId;
          const msgDate = new Date(msg.createdAt);
          const dividerKey = msgDate.toDateString();
          const showDivider = dividerKey !== lastDividerKey;
          if (showDivider) lastDividerKey = dividerKey;

          const prevMsg = messages[i - 1];
          const isGrouped =
            !showDivider && prevMsg && prevMsg.senderId === msg.senderId;

          return (
            <div key={msg.id}>
              {showDivider && (
                <div className="my-4 flex items-center justify-center">
                  <span className="rounded-full bg-[var(--color-bg)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
                    {formatDayDivider(msgDate)}
                  </span>
                </div>
              )}
              <div
                className={`flex ${isOwn ? "justify-end" : "justify-start"} ${
                  isGrouped ? "mt-0.5" : "mt-3"
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    isOwn
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-[var(--color-border)] text-[var(--color-text-primary)]"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                  <p className="mt-1 text-right text-[10px] opacity-70">
                    {msgDate.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Blocked state — simple centered message with unblock link if you blocked them */}
      {isBlocked ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {blockedByMe === true ? (
              <>
                You blocked {otherUser.name || otherUser.username}.
                <button
                  onClick={handleUnblock}
                  disabled={isUnblocking}
                  className="ml-1 text-[var(--color-accent)] underline hover:no-underline disabled:opacity-50"
                >
                  {isUnblocking ? "Unblocking..." : "Unblock them"}
                </button>
              </>
            ) : blockedByMe === false ? (
              <>You have been blocked by {otherUser.name || otherUser.username}.</>
            ) : (
              <>This conversation is blocked.</>
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-[var(--color-border)] pt-3">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="max-h-[120px] flex-1 resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="flex-shrink-0 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            aria-label="Send message"
          >
            {isSending ? (
              <span className="h-4 w-4 animate-pulse rounded-full bg-white/60" aria-label="Sending message" />
            ) : (
              <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4" />
            )}
          </button>
        </form>
      )}
    </div>
  );
}