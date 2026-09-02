"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faUser,
  faCog,
  faRightFromBracket,
  faShieldAlt,
  faPlay,
  faChartLine,
  faChartPie,
  faEnvelope,
} from "@fortawesome/free-solid-svg-icons";
import { NexusLogo } from "@/components/NexusLogo";
import { authClient, useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/react";
import { NotificationBell } from "@/components/features/notifications/NotificationBell";

function Avatar({
  name,
  image,
}: {
  name: string;
  image?: string | null;
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-bold text-white">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session } = trpc.auth.getSession.useQuery();
  const { data: clientSession } = useSession();
  const utils = trpc.useUtils();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Get user's communities to check if they are a creator
  const { data: myCommunities } = trpc.community.myCommunities.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });

  //  Get unread messages count
  const { data: unreadMessages } = trpc.message.getUnreadCount.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });

  const userName =
    session?.user?.name || clientSession?.user?.name || "there";
  const userImage = session?.user?.image || clientSession?.user?.image || null;
  const userUsername = (clientSession?.user as { username?: string } | undefined)?.username;
  const userId = session?.user?.id || clientSession?.user?.id;

  const isCommunityOwner = myCommunities && myCommunities.length > 0;

  //  Listen for new messages to refresh unread count
  useEffect(() => {
    const handler = () => {
      utils.message.getUnreadCount.invalidate();
    };
    window.addEventListener("new_message", handler);
    return () => window.removeEventListener("new_message", handler);
  }, [utils]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await authClient.signOut();
    } catch {
      // ignore
    }
    await utils.auth.getSession.invalidate();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <NexusLogo className="h-7 w-7" />
            <span className="font-display text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
              Nexus
            </span>
          </Link>

          <div className="flex items-center gap-5">
            {/* Primary nav — its own group */}
            <div className="flex items-center gap-4">
              <Link
                href="/feed"
                className="text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-accent)]"
              >
                Feed
              </Link>
              <Link
                href="/discover"
                className="text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-accent)]"
              >
                Discover
              </Link>
            </div>

            {!userId ? (
              <span className="text-sm text-[var(--color-text-secondary)]">
                {userName}
              </span>
            ) : (
              <>
                {/* Divider separates navigation from account/utility icons —
                    without it, everything reads as one uneven row. */}
                <div className="h-5 w-px bg-[var(--color-border)]" />

                {/* Utility icons — tighter, consistent spacing, and the
                    envelope now gets the same padded hover treatment as
                    the avatar button so all three feel like one set. */}
                <div className="flex items-center gap-1">
                  <Link
                    href="/messages"
                    className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
                    aria-label="Messages"
                  >
                    <FontAwesomeIcon icon={faEnvelope} className="h-5 w-5" />
                    {unreadMessages !== undefined && unreadMessages > 0 && (
                      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadMessages > 9 ? "9+" : unreadMessages}
                      </span>
                    )}
                  </Link>

                  <NotificationBell />

                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setMenuOpen((s) => !s)}
                      className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-[var(--color-bg)]"
                      aria-label="Account menu"
                    >
                      <Avatar name={userName} image={userImage} />
                      <FontAwesomeIcon
                        icon={faChevronDown}
                        className={`h-3 w-3 text-[var(--color-text-secondary)] transition-transform ${
                          menuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {menuOpen && (
                      <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
                        <div className="border-b border-[var(--color-border)] px-4 py-3">
                          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                            {userName}
                          </p>
                          {userUsername && (
                            <p className="truncate text-xs text-[var(--color-text-secondary)]">
                              @{userUsername}
                            </p>
                          )}
                        </div>
                        <div className="py-1">
                          <Link
                            href={`/profile/${userUsername ?? ""}`}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
                          >
                            <FontAwesomeIcon
                              icon={faUser}
                              className="h-4 w-4 text-[var(--color-text-secondary)]"
                            />
                            Profile
                          </Link>

                          <Link
                            href="/my-learning"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
                          >
                            <FontAwesomeIcon
                              icon={faPlay}
                              className="h-4 w-4 text-[var(--color-text-secondary)]"
                            />
                            My Learning
                          </Link>

                          <Link
                            href="/profile/edit"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
                          >
                            <FontAwesomeIcon
                              icon={faCog}
                              className="h-4 w-4 text-[var(--color-text-secondary)]"
                            />
                            Settings
                          </Link>

                          {isCommunityOwner && (
                            <Link
                              href="/creator/revenue"
                              onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
                            >
                              <FontAwesomeIcon
                                icon={faChartLine}
                                className="h-4 w-4 text-[var(--color-text-secondary)]"
                              />
                              Revenue
                            </Link>
                          )}

                          {((session && session.user?.globalRole === "admin") || (session && session.user?.globalRole === "super_admin")) && (
                            <>
                              <Link
                                href="/admin"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
                              >
                                <FontAwesomeIcon
                                  icon={faShieldAlt}
                                  className="h-4 w-4 text-[var(--color-text-secondary)]"
                                />
                                Admin dashboard
                              </Link>

                              <Link
                                href="/admin/revenue"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
                              >
                                <FontAwesomeIcon
                                  icon={faChartPie}
                                  className="h-4 w-4 text-[var(--color-text-secondary)]"
                                />
                                Platform Revenue
                              </Link>
                            </>
                          )}
                        </div>
                        <div className="border-t border-[var(--color-border)] py-1">
                          <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                          >
                            <FontAwesomeIcon
                              icon={faRightFromBracket}
                              className="h-4 w-4 text-current"
                            />
                            Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}