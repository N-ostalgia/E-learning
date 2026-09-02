// src/app/(dashboard)/admin/layout.tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import { trpc } from "@/lib/trpc/react";
import { useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGaugeHigh,
  faFlag,
  faUsers,
  faBuilding,
  faCog,
  faShield,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: faGaugeHigh },
  { href: "/admin/reports", label: "Reports", icon: faFlag },
  { href: "/admin/users", label: "Users", icon: faUsers },
  { href: "/admin/communities", label: "Communities", icon: faBuilding },
  { href: "/admin/settings", label: "Settings", icon: faCog, superAdmin: true },
  { href: "/admin/health", label: "System Health", icon: faShield, superAdmin: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isLoading } = trpc.auth.getSession.useQuery();

  useEffect(() => {
    if (!isLoading) {
      if (!session) {
        router.push("/login");
        return;
      }
      const role = session.user.globalRole;
      if (role !== "admin" && role !== "super_admin") {
        router.push("/feed");
      }
    }
  }, [session, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }

  const role = session?.user?.globalRole;
  const isSuperAdmin = role === "super_admin";

  const filteredNavItems = NAV_ITEMS.filter(
    (item) => !item.superAdmin || isSuperAdmin
  );

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
        {/* Logo */}
        <div className="border-b border-[var(--color-border)] px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent)] text-white">
              <FontAwesomeIcon icon={faGaugeHigh} className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-[var(--color-text-primary)]">
                Admin
              </h1>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {isSuperAdmin ? "Super Admin" : "Moderator"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Back to App */}
        <div className="border-t border-[var(--color-border)] p-4">
          <Link
            href="/feed"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
            Back to App
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}