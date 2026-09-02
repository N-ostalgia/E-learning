"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faUser,
  faCrown,
  faShield,
  faUserGroup,
  faChevronLeft,
  faSpinner,
  faUsers,
  faCalendar,
  faEnvelope,
  faEllipsisVertical,
  faEye,
  faUserPlus,
  faUserMinus,
  faUserXmark,
  faCircle,
  faClock,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { useWebSocket } from "@/hooks/useWebSocket";

type RoleFilter = "all" | "admin" | "member";
type ActivityFilter = "all" | "active" | "inactive";
type SortOption = "newest" | "oldest" | "mostActive";

interface UserActivity {
  userId: string;
  status: "online" | "away" | "offline";
  lastSeen: Date;
}

const PAGE_SIZE = 20;

function MemberActionsMenu({
  member,
  canManage,
  onPromote,
  onDemote,
  onRemove,
  onMessage, // NEW: callback for messaging
}: {
  member: any;
  canManage: boolean;
  onPromote: (userId: string) => void;
  onDemote: (userId: string) => void;
  onRemove: (userId: string) => void;
  onMessage: (userId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const isOwnerUser = member.role === "owner";
  const isAdminUser = member.role === "admin";
  const showManagement = canManage && !isOwnerUser;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-md p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
        aria-label="Member actions"
      >
        <FontAwesomeIcon icon={faEllipsisVertical} className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg">
          <Link
            href={`/profile/${member.username}`}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
            onClick={() => setOpen(false)}
          >
            <FontAwesomeIcon icon={faEye} className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
            View Profile
          </Link>

          {/* ✅ Message button - now functional */}
          <button
            onClick={() => {
              onMessage(member.userId);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
          >
            <FontAwesomeIcon icon={faEnvelope} className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
            Message
          </button>

          {showManagement && (
            <>
              <div className="my-1 border-t border-[var(--color-border)]" />
              {isAdminUser ? (
                <button
                  onClick={() => {
                    onDemote(member.userId);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
                >
                  <FontAwesomeIcon icon={faUserMinus} className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
                  Demote to Member
                </button>
              ) : (
                <button
                  onClick={() => {
                    onPromote(member.userId);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
                >
                  <FontAwesomeIcon icon={faUserPlus} className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
                  Promote to Admin
                </button>
              )}
              <button
                onClick={() => {
                  onRemove(member.userId);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <FontAwesomeIcon icon={faUserXmark} className="h-3.5 w-3.5" />
                Remove Member
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function CommunityMembersPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Pagination
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  // Real-time activity
  const [userActivities, setUserActivities] = useState<Map<string, UserActivity>>(new Map());

  const { data: session } = trpc.auth.getSession.useQuery();
  const currentUserId = session?.user?.id;

  const { socket } = useWebSocket(currentUserId);

  // Message mutation
  const createConversation = trpc.message.getOrCreate.useMutation({
    onSuccess: (data) => {
      router.push(`/messages/${data.conversationId}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to start conversation");
    },
  });

  const handleStartConversation = (userId: string) => {
    if (!currentUserId) {
      toast.error("Please sign in to send messages");
      return;
    }
    if (userId === currentUserId) {
      toast.error("You can't message yourself");
      return;
    }
    createConversation.mutate({ userId });
  };

  useEffect(() => {
    if (!socket) return;

    const handleActivity = (data: { userId: string; status: "online" | "away" | "offline"; timestamp: number }) => {
      setUserActivities((prev) => {
        const newMap = new Map(prev);
        newMap.set(data.userId, {
          userId: data.userId,
          status: data.status,
          lastSeen: new Date(data.timestamp),
        });
        return newMap;
      });
    };

    socket.on("user_activity", handleActivity);
    socket.emit("join_community", { communityId: slug });

    return () => {
      socket.off("user_activity", handleActivity);
      socket.emit("leave_community", { communityId: slug });
    };
  }, [socket, slug]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setDisplayCount(PAGE_SIZE);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading, refetch } = trpc.members.getCommunityMembers.useQuery(
    {
      communitySlug: slug,
      limit: 200,
      search: debouncedSearch || undefined,
    },
    {
      enabled: !!slug,
    }
  );

  const utils = trpc.useUtils();

  const promoteToAdmin = trpc.members.promoteToAdmin.useMutation({
    onSuccess: () => {
      toast.success("Member promoted to Admin");
      refetch();
      utils.members.getCommunityMembers.invalidate({ communitySlug: slug });
    },
    onError: (err) => toast.error(err.message || "Failed to promote member"),
  });

  const demoteToMember = trpc.members.demoteToMember.useMutation({
    onSuccess: () => {
      toast.success("Admin demoted to Member");
      refetch();
      utils.members.getCommunityMembers.invalidate({ communitySlug: slug });
    },
    onError: (err) => toast.error(err.message || "Failed to demote admin"),
  });

  const removeMember = trpc.members.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed from community");
      refetch();
      utils.members.getCommunityMembers.invalidate({ communitySlug: slug });
    },
    onError: (err) => toast.error(err.message || "Failed to remove member"),
  });

  const allMembers = data?.members || [];
  const isOwner = data?.userRole === "owner";
  const isAdmin = data?.userRole === "admin";
  const canManage = isOwner || isAdmin;

  // Role badge
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            <FontAwesomeIcon icon={faCrown} className="h-3 w-3" />
            Owner
          </span>
        );
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            <FontAwesomeIcon icon={faShield} className="h-3 w-3" />
            Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            <FontAwesomeIcon icon={faUser} className="h-3 w-3" />
            Member
          </span>
        );
    }
  };

  // Activity status
  const getActivityStatus = (member: any) => {
    const activity = userActivities.get(member.userId);
    if (activity) {
      if (activity.status === "online") {
        return { status: "active", label: "Online", color: "text-emerald-500" };
      }
      if (activity.status === "away") {
        return { status: "recent", label: "Away", color: "text-yellow-500" };
      }
      const now = Date.now();
      const lastSeen = activity.lastSeen.getTime();
      if (now - lastSeen < 300000) {
        return { status: "recent", label: "Recent", color: "text-gray-500" };
      }
      return { status: "inactive", label: "Inactive", color: "text-gray-400" };
    }

    // Fallback
    const now = new Date();
    const joinedDate = new Date(member.joinedAt);
    const daysSinceJoined = (now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceJoined < 7) {
      return { status: "active", label: "Active", color: "text-emerald-500" };
    } else if (daysSinceJoined < 30) {
      return { status: "recent", label: "Recent", color: "text-gray-500" };
    } else {
      return { status: "inactive", label: "Inactive", color: "text-gray-400" };
    }
  };

  // Filter and sort
  const filterAndSortMembers = (members: any[]) => {
    let filtered = [...members];

    if (roleFilter === "admin") {
      filtered = filtered.filter((m) => m.role === "owner" || m.role === "admin");
    } else if (roleFilter === "member") {
      filtered = filtered.filter((m) => m.role === "member");
    }

    if (activityFilter !== "all") {
      filtered = filtered.filter((m) => {
        const activity = getActivityStatus(m);
        if (activityFilter === "active") {
          return activity.status === "active" || activity.status === "recent";
        } else {
          return activity.status === "inactive";
        }
      });
    }

    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
        break;
      case "mostActive":
        filtered.sort((a, b) => {
          const activityA = getActivityStatus(a);
          const activityB = getActivityStatus(b);
          const order = { active: 0, recent: 1, inactive: 2 };
          return (order[activityA.status as keyof typeof order] || 2) - (order[activityB.status as keyof typeof order] || 2);
        });
        break;
      default:
        break;
    }

    return filtered;
  };

  const filteredMembers = filterAndSortMembers(allMembers);
  const totalFiltered = filteredMembers.length;

  // Pagination slice
  const displayedMembers = filteredMembers.slice(0, displayCount);
  const hasMore = displayCount < totalFiltered;

  const handleLoadMore = () => {
    setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, totalFiltered));
  };

  // Stats
  const totalMembers = allMembers.length;
  const activeMembers = allMembers.filter((m) => {
    const activity = getActivityStatus(m);
    return activity.status === "active" || activity.status === "recent";
  }).length;
  const inactiveMembers = totalMembers - activeMembers;

  const getFilterCount = (filter: RoleFilter) => {
    if (filter === "all") return allMembers.length;
    if (filter === "admin") {
      return allMembers.filter((m) => m.role === "owner" || m.role === "admin").length;
    }
    if (filter === "member") {
      return allMembers.filter((m) => m.role === "member").length;
    }
    return 0;
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-border)]" />
        <div className="h-24 animate-pulse rounded-xl bg-[var(--color-border)]" />
        <div className="h-96 animate-pulse rounded-xl bg-[var(--color-border)]" />
      </div>
    );
  }

  const handleRoleAction = (action: string, userId: string) => {
    if (action === "promote") {
      if (confirm("Promote this member to Admin?")) {
        promoteToAdmin.mutate({ communitySlug: slug, userId });
      }
    } else if (action === "demote") {
      if (confirm("Demote this Admin back to Member?")) {
        demoteToMember.mutate({ communitySlug: slug, userId });
      }
    } else if (action === "remove") {
      if (confirm("Remove this member from the community? This action cannot be undone.")) {
        removeMember.mutate({ communitySlug: slug, userId });
      }
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
              Members
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              <FontAwesomeIcon icon={faUserGroup} className="mr-2 h-4 w-4" />
              {totalMembers} members
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <FontAwesomeIcon icon={faUsers} className="h-4 w-4" />
            Total Members
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-[var(--color-text-primary)]">
            {totalMembers}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <FontAwesomeIcon icon={faCircle} className="h-4 w-4 text-emerald-500" />
            Active Members
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-[var(--color-text-primary)]">
            {activeMembers}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <FontAwesomeIcon icon={faClock} className="h-4 w-4 text-gray-400" />
            Inactive Members
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-[var(--color-text-primary)]">
            {inactiveMembers}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-4 text-sm text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent)]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="mostActive">Most active</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Role Filters */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "All" },
              { id: "admin", label: "Admins" },
              { id: "member", label: "Members" },
            ].map((filter) => {
              const isActive = roleFilter === filter.id;
              const count = getFilterCount(filter.id as RoleFilter);
              
              return (
                <button
                  key={filter.id}
                  onClick={() => setRoleFilter(filter.id as RoleFilter)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--color-accent)] text-white"
                      : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  }`}
                >
                  {filter.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[var(--color-bg)] text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="text-[var(--color-text-secondary)]">|</span>

          {/* Activity Filters */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "All Activity", icon: faUsers },
              { id: "active", label: "Active", icon: faCircle, iconColor: "text-emerald-500" },
              { id: "inactive", label: "Inactive", icon: faCircle, iconColor: "text-gray-400" },
            ].map((filter) => {
              const isActive = activityFilter === filter.id;
              
              return (
                <button
                  key={filter.id}
                  onClick={() => setActivityFilter(filter.id as ActivityFilter)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--color-accent)] text-white"
                      : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  }`}
                >
                  {filter.icon && (
                    <FontAwesomeIcon icon={filter.icon} className={`h-3 w-3 ${filter.iconColor || ''}`} />
                  )}
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Members Table */}
      {displayedMembers.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <FontAwesomeIcon icon={faUserGroup} className="mx-auto h-12 w-12 text-[var(--color-text-secondary)]" />
          <h3 className="mt-4 font-display text-lg font-semibold text-[var(--color-text-primary)]">
            {searchTerm ? "No members found" : "This community has no members yet"}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {searchTerm ? `No members matching "${searchTerm}"` : "Members will appear here once they join"}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--color-bg)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Member
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Activity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Joined
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {displayedMembers.map((member) => {
                    const activity = getActivityStatus(member);

                    return (
                      <tr key={member.userId} className="transition-colors hover:bg-[var(--color-bg)]">
                        <td className="px-4 py-3">
                          <Link
                            href={`/profile/${member.username}`}
                            className="flex items-center gap-3 group"
                          >
                            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full">
                              {member.avatar ? (
                                <img
                                  src={member.avatar}
                                  alt={member.username}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                                  <FontAwesomeIcon icon={faUser} className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
                                {member.name || member.username}
                              </p>
                              <p className="text-xs text-[var(--color-text-secondary)]">
                                @{member.username}
                              </p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {getRoleBadge(member.role)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm ${activity.color}`}>
                            {activity.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
                            <FontAwesomeIcon icon={faCalendar} className="h-3 w-3" />
                            {new Date(member.joinedAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end">
                            <MemberActionsMenu
                              member={member}
                              canManage={canManage}
                              onPromote={(userId) => handleRoleAction("promote", userId)}
                              onDemote={(userId) => handleRoleAction("demote", userId)}
                              onRemove={(userId) => handleRoleAction("remove", userId)}
                              onMessage={handleStartConversation}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={handleLoadMore}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-accent)]"
              >
                <FontAwesomeIcon icon={faChevronDown} className="h-4 w-4" />
                Load More ({displayCount} of {totalFiltered})
              </button>
            </div>
          )}

          {/* Show total count */}
          <div className="mt-2 text-center text-xs text-[var(--color-text-secondary)]">
            Showing {displayedMembers.length} of {totalFiltered} members
          </div>
        </>
      )}
    </div>
  );
}