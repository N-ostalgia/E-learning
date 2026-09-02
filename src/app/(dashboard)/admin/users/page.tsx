// src/app/(dashboard)/admin/users/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faUser,
  faCheckCircle,
  faTimesCircle,
  faBan,
  faTrash,
  faEllipsisVertical,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";

type UserRole = "member" | "admin" | "super_admin";

const ROLE_BADGES: Record<UserRole, { label: string; className: string }> = {
  member: {
    label: "Member",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  admin: {
    label: "Admin",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  super_admin: {
    label: "Super Admin",
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
};

function UserActionsMenu({
  user,
  isSuper,
  onSuspend,
  onUnsuspend,
  onDelete,
  onUpdateRole,
}: {
  user: { id: string; isSuspended: boolean; globalRole: string };
  isSuper: boolean;
  onSuspend: (id: string) => void;
  onUnsuspend: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateRole: (id: string, role: UserRole) => void;
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-md p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
        aria-label="User actions"
      >
        <FontAwesomeIcon icon={faEllipsisVertical} className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg">
          {user.isSuspended ? (
            <button
              onClick={() => {
                onUnsuspend(user.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-600 hover:bg-[var(--color-bg)]"
            >
              <FontAwesomeIcon icon={faCheckCircle} className="h-3.5 w-3.5" />
              Unsuspend user
            </button>
          ) : (
            <button
              onClick={() => {
                onSuspend(user.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-600 hover:bg-[var(--color-bg)]"
            >
              <FontAwesomeIcon icon={faBan} className="h-3.5 w-3.5" />
              Suspend user
            </button>
          )}

          {isSuper && (
            <>
              <div className="my-1 border-t border-[var(--color-border)]" />
              <div className="px-3 py-1.5">
                <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                  Change role
                </label>
                <select
                  value={user.globalRole}
                  onChange={(e) => {
                    onUpdateRole(user.id, e.target.value as UserRole);
                    setOpen(false);
                  }}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="my-1 border-t border-[var(--color-border)]" />
              <button
                onClick={() => {
                  onDelete(user.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                Delete user
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const utils = trpc.useUtils();

  const { data: session } = trpc.auth.getSession.useQuery();
  const isSuper = session?.user?.globalRole === "super_admin";

  const { data, isLoading, refetch } = trpc.admin.users.list.useQuery({
    search: debouncedSearch || undefined,
    role: roleFilter === "all" ? undefined : roleFilter,
    limit: 100,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    refetch();
  }, [debouncedSearch, roleFilter, refetch]);

  const suspendMutation = trpc.admin.users.suspend.useMutation({
    onSuccess: () => {
      utils.admin.users.list.invalidate();
      refetch();
      toast.success("User suspended");
    },
    onError: (err) => toast.error(err.message || "Failed to suspend user"),
  });

  const unsuspendMutation = trpc.admin.users.unsuspend.useMutation({
    onSuccess: () => {
      utils.admin.users.list.invalidate();
      refetch();
      toast.success("User unsuspended");
    },
    onError: (err) => toast.error(err.message || "Failed to unsuspend user"),
  });

  const deleteMutation = trpc.admin.users.delete.useMutation({
    onSuccess: () => {
      utils.admin.users.list.invalidate();
      refetch();
      toast.success("User deleted");
    },
    onError: (err) => toast.error(err.message || "Failed to delete user"),
  });

  const updateRoleMutation = trpc.admin.users.updateRole.useMutation({
    onSuccess: () => {
      utils.admin.users.list.invalidate();
      refetch();
      toast.success("Role updated");
    },
    onError: (err) => toast.error(err.message || "Failed to update role"),
  });

  const handleSuspend = (userId: string) => {
    if (confirm("Suspend this user?")) suspendMutation.mutate({ userId });
  };
  const handleUnsuspend = (userId: string) => unsuspendMutation.mutate({ userId });
  const handleDelete = (userId: string) => {
    if (confirm("Permanently delete this user? This cannot be undone."))
      deleteMutation.mutate({ userId });
  };
  const handleUpdateRole = (userId: string, role: UserRole) =>
    updateRoleMutation.mutate({ userId, role });

  const users = data?.items ?? [];
  const getRoleCount = (role: UserRole) =>
    users.filter((u) => u.globalRole === role).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--color-border)]" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
              Users
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Manage platform users and their roles
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <span className="font-medium text-[var(--color-text-primary)]">{users.length}</span> users
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]"
          />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-4 text-sm text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent)]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "member", "admin", "super_admin"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                roleFilter === r
                  ? "bg-[var(--color-accent)] text-white"
                  : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              }`}
            >
              {r === "all"
                ? `All (${users.length})`
                : r === "super_admin"
                ? `Super Admins (${getRoleCount("super_admin")})`
                : `${r.charAt(0).toUpperCase() + r.slice(1)}s (${getRoleCount(r)})`}
            </button>
          ))}
        </div>
      </div>

      {users.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <FontAwesomeIcon icon={faUser} className="mx-auto h-12 w-12 text-[var(--color-text-secondary)]" />
          <h3 className="mt-4 font-display text-lg font-semibold text-[var(--color-text-primary)]">
            No users found
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {search ? `No users matching "${search}"` : "There are no users on the platform yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full divide-y divide-[var(--color-border)]">
              <thead className="bg-[var(--color-bg)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Joined</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                {users.map((user) => {
                  const roleBadge = ROLE_BADGES[user.globalRole as UserRole] ?? ROLE_BADGES.member;
                  const isSuspended = user.isSuspended;

                  return (
                    <tr key={user.id} className="transition-colors hover:bg-[var(--color-bg)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.image ? (
                            <img src={user.image} alt={user.name} className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-medium text-emerald-700">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-[var(--color-text-primary)]">{user.name}</p>
                            <p className="text-xs text-[var(--color-text-secondary)]">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-[var(--color-text-primary)]">{user.email}</span>
                        {user.emailVerified ? (
                          <FontAwesomeIcon icon={faCheckCircle} className="ml-1.5 h-3 w-3 text-emerald-500" />
                        ) : (
                          <FontAwesomeIcon icon={faTimesCircle} className="ml-1.5 h-3 w-3 text-amber-500" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleBadge.className}`}>
                          {roleBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                            <FontAwesomeIcon icon={faBan} className="h-3 w-3" />
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <FontAwesomeIcon icon={faCheckCircle} className="h-3 w-3" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <UserActionsMenu
                          user={user}
                          isSuper={isSuper}
                          onSuspend={handleSuspend}
                          onUnsuspend={handleUnsuspend}
                          onDelete={handleDelete}
                          onUpdateRole={handleUpdateRole}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}