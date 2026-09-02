"use client";

import { useState } from "react";
import { ProfileActivity } from "./ProfileActivity";
import { ProfileCommunities } from "./ProfileCommunities";
import { ProfileBadges } from "./ProfileBadges";

const TABS = [
  { id: "activity", label: "Activity" },
  { id: "communities", label: "Communities" },
  { id: "badges", label: "Badges" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface ProfileTabsProps {
  userId: string;
}

export function ProfileTabs({ userId }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("activity");

  return (
    <div>
      <div className="border-b border-[var(--color-border)]">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === "activity" && <ProfileActivity userId={userId} />}
        {activeTab === "communities" && <ProfileCommunities userId={userId} />}
        {activeTab === "badges" && <ProfileBadges userId={userId} />}
      </div>
    </div>
  );
}