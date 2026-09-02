"use client";
import React from "react";

export default function UserTableRow({ user, onSuspend, onUnsuspend, onDelete, onUpdateRole, isSuper }: any) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 mb-4 flex items-center justify-between">
      <div>
        <div className="text-sm text-[var(--color-text-primary)] font-medium">{user.name} <span className="text-[var(--color-text-secondary)]">@{user.username}</span></div>
        <div className="mt-1 text-sm text-[var(--color-text-secondary)]">{user.email} • Role: {user.globalRole}</div>
        <div className="mt-1 text-sm text-[var(--color-text-secondary)]">Status: {user.isSuspended ? 'Suspended' : 'Active'}</div>
      </div>
      <div className="flex items-center gap-2">
        {user.isSuspended ? (
          <button onClick={() => onUnsuspend(user.id)} className="rounded-lg bg-green-600 px-3 py-1 text-sm text-white">Unsuspend</button>
        ) : (
          <button onClick={() => onSuspend(user.id)} className="rounded-lg bg-yellow-600 px-3 py-1 text-sm text-white">Suspend</button>
        )}
        {isSuper && (
          <>
            <select defaultValue={user.globalRole} onChange={(e) => onUpdateRole(user.id, e.target.value)} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm">
              <option value="member">member</option>
              <option value="admin">admin</option>
              <option value="super_admin">super_admin</option>
            </select>
            <button onClick={() => onDelete(user.id)} className="rounded-lg bg-red-600 px-3 py-1 text-sm text-white">Delete</button>
          </>
        )}
      </div>
    </div>
  );
}
