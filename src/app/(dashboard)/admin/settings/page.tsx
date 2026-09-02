// src/app/(dashboard)/admin/settings/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSave,
  faGlobe,
  faUserCog,
  faShield,
  faTrophy,
  faCreditCard,
  faEnvelope,
  faCheckCircle,
  faUndo,
  faToggleOn,
  faToggleOff,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";

// ✅ Only fields that exist in your backend
const defaultSettings = {
  platformName: "Nexus",
  platformTagline: "Learn Together, Grow Together",
  supportEmail: "support@nexus.com",
  allowRegistration: true,
  defaultUserRole: "member",
  requireEmailVerification: true,
  usernameMinLength: 3,
  usernameMaxLength: 20,
  autoSuspendThreshold: 3,
  postApprovalRequired: false,
  commentApprovalRequired: false,
  maxCommunitiesPerUser: 10,
  defaultCommunityPrivacy: "public",
  gamificationEnabled: true,
  pointsForPost: 10,
  pointsForComment: 5,
  pointsForLikeReceived: 3,
  pointsForLessonComplete: 20,
  stripeMode: "test",
  platformFee: 10,
  minimumPayout: 25,
  welcomeEmailEnabled: true,
  notificationEmailEnabled: true,
  digestFrequency: "daily",
};

export default function SettingsPage() {
  const { data: settings, isLoading, refetch } = trpc.admin.settings.get.useQuery();
  const update = trpc.admin.settings.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Settings updated successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update settings");
    },
  });

  const [formData, setFormData] = useState(defaultSettings);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(formData);
  };

  const handleReset = () => {
    setFormData(defaultSettings);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
              Platform Settings
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Configure global platform settings
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)]"
            >
              <FontAwesomeIcon icon={faUndo} className="h-4 w-4" />
              Reset
            </button>
            <button
              onClick={handleSubmit}
              disabled={update.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faSave} className="h-4 w-4" />
              {update.isPending ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Platform */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <FontAwesomeIcon icon={faGlobe} className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-text-primary)]">Platform</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">General platform settings</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Platform Name</label>
              <input
                type="text"
                value={formData.platformName}
                onChange={(e) => handleChange("platformName", e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Tagline</label>
              <input
                type="text"
                value={formData.platformTagline}
                onChange={(e) => handleChange("platformTagline", e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Support Email</label>
              <input
                type="email"
                value={formData.supportEmail}
                onChange={(e) => handleChange("supportEmail", e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              />
            </div>
          </div>
        </div>

        {/* Registration */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <FontAwesomeIcon icon={faUserCog} className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-text-primary)]">Registration & Users</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">User registration and account settings</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleChange("allowRegistration", !formData.allowRegistration)}
                className="text-lg"
              >
                <FontAwesomeIcon
                  icon={formData.allowRegistration ? faToggleOn : faToggleOff}
                  className={`h-6 w-6 ${formData.allowRegistration ? "text-emerald-500" : "text-[var(--color-text-secondary)]"}`}
                />
              </button>
              <div>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">Allow Registration</span>
                <p className="text-xs text-[var(--color-text-secondary)]">Enable new user sign-ups</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleChange("requireEmailVerification", !formData.requireEmailVerification)}
                className="text-lg"
              >
                <FontAwesomeIcon
                  icon={formData.requireEmailVerification ? faToggleOn : faToggleOff}
                  className={`h-6 w-6 ${formData.requireEmailVerification ? "text-emerald-500" : "text-[var(--color-text-secondary)]"}`}
                />
              </button>
              <div>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">Email Verification Required</span>
                <p className="text-xs text-[var(--color-text-secondary)]">Require email confirmation before login</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Default User Role</label>
              <select
                value={formData.defaultUserRole}
                onChange={(e) => handleChange("defaultUserRole", e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm font-medium text-[var(--color-text-primary)]">Username Min Length</label>
                <input
                  type="number"
                  min={2}
                  max={30}
                  value={formData.usernameMinLength}
                  onChange={(e) => handleChange("usernameMinLength", Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-[var(--color-text-primary)]">Username Max Length</label>
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={formData.usernameMaxLength}
                  onChange={(e) => handleChange("usernameMaxLength", Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Moderation */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <FontAwesomeIcon icon={faShield} className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-text-primary)]">Moderation</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">Content moderation settings</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Auto Suspend Threshold</label>
              <input
                type="number"
                min={1}
                max={10}
                value={formData.autoSuspendThreshold}
                onChange={(e) => handleChange("autoSuspendThreshold", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              />
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Users suspended after {formData.autoSuspendThreshold} violations</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleChange("postApprovalRequired", !formData.postApprovalRequired)}
                className="text-lg"
              >
                <FontAwesomeIcon
                  icon={formData.postApprovalRequired ? faToggleOn : faToggleOff}
                  className={`h-6 w-6 ${formData.postApprovalRequired ? "text-emerald-500" : "text-[var(--color-text-secondary)]"}`}
                />
              </button>
              <div>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">Post Approval Required</span>
                <p className="text-xs text-[var(--color-text-secondary)]">Require approval before publishing posts</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleChange("commentApprovalRequired", !formData.commentApprovalRequired)}
                className="text-lg"
              >
                <FontAwesomeIcon
                  icon={formData.commentApprovalRequired ? faToggleOn : faToggleOff}
                  className={`h-6 w-6 ${formData.commentApprovalRequired ? "text-emerald-500" : "text-[var(--color-text-secondary)]"}`}
                />
              </button>
              <div>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">Comment Approval Required</span>
                <p className="text-xs text-[var(--color-text-secondary)]">Require approval before publishing comments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Gamification */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <FontAwesomeIcon icon={faTrophy} className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-text-primary)]">Gamification</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">Points and rewards settings</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => handleChange("gamificationEnabled", !formData.gamificationEnabled)}
              className="text-lg"
            >
              <FontAwesomeIcon
                icon={formData.gamificationEnabled ? faToggleOn : faToggleOff}
                className={`h-6 w-6 ${formData.gamificationEnabled ? "text-emerald-500" : "text-[var(--color-text-secondary)]"}`}
              />
            </button>
            <div>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">Enable Gamification</span>
              <p className="text-xs text-[var(--color-text-secondary)]">Award points for user actions</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Points for Post</label>
              <input
                type="number"
                min={0}
                value={formData.pointsForPost}
                onChange={(e) => handleChange("pointsForPost", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Points for Comment</label>
              <input
                type="number"
                min={0}
                value={formData.pointsForComment}
                onChange={(e) => handleChange("pointsForComment", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Points for Like Received</label>
              <input
                type="number"
                min={0}
                value={formData.pointsForLikeReceived}
                onChange={(e) => handleChange("pointsForLikeReceived", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Points for Lesson Complete</label>
              <input
                type="number"
                min={0}
                value={formData.pointsForLessonComplete}
                onChange={(e) => handleChange("pointsForLessonComplete", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              />
            </div>
          </div>
        </div>

        {/* Payments */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <FontAwesomeIcon icon={faCreditCard} className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-text-primary)]">Payments</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">Stripe and payout settings</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Stripe Mode</label>
              <select
                value={formData.stripeMode}
                onChange={(e) => handleChange("stripeMode", e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              >
                <option value="test">Test</option>
                <option value="live">Live</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Platform Fee (%)</label>
              <input
                type="number"
                min={0}
                max={50}
                value={formData.platformFee}
                onChange={(e) => handleChange("platformFee", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Minimum Payout ($)</label>
              <input
                type="number"
                min={0}
                value={formData.minimumPayout}
                onChange={(e) => handleChange("minimumPayout", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              />
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <FontAwesomeIcon icon={faEnvelope} className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-text-primary)]">Email</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">Email notification settings</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleChange("welcomeEmailEnabled", !formData.welcomeEmailEnabled)}
                className="text-lg"
              >
                <FontAwesomeIcon
                  icon={formData.welcomeEmailEnabled ? faToggleOn : faToggleOff}
                  className={`h-6 w-6 ${formData.welcomeEmailEnabled ? "text-emerald-500" : "text-[var(--color-text-secondary)]"}`}
                />
              </button>
              <div>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">Welcome Email</span>
                <p className="text-xs text-[var(--color-text-secondary)]">Send welcome email on signup</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleChange("notificationEmailEnabled", !formData.notificationEmailEnabled)}
                className="text-lg"
              >
                <FontAwesomeIcon
                  icon={formData.notificationEmailEnabled ? faToggleOn : faToggleOff}
                  className={`h-6 w-6 ${formData.notificationEmailEnabled ? "text-emerald-500" : "text-[var(--color-text-secondary)]"}`}
                />
              </button>
              <div>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">Notification Emails</span>
                <p className="text-xs text-[var(--color-text-secondary)]">Send email notifications</p>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Digest Frequency</label>
              <select
                value={formData.digestFrequency}
                onChange={(e) => handleChange("digestFrequency", e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {update.isSuccess && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50/50 p-3 text-sm text-emerald-700 border border-emerald-200">
            <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4 text-emerald-500" />
            Settings saved successfully
          </div>
        )}
      </form>
    </div>
  );
}