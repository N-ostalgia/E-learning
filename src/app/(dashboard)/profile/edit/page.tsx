"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faSave,
  faUser,
  faTrash,
  faGlobe,
  faLocationDot,
  faLink,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";
import { FileUploader } from "@/components/features/upload/FileUploader";

export default function EditProfilePage() {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } =
    trpc.auth.getSession.useQuery();

  const userId = session?.user?.id;

  const { data: profile, refetch } = trpc.profile.getById.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  );

  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [github, setGithub] = useState("");
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarKey, setAvatarKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || "");
      setWebsite(profile.website || "");
      setLocation(profile.location || "");
      setGithub(profile.github || "");
      setTwitter(profile.twitter || "");
      setLinkedin(profile.linkedin || "");
      setAvatarUrl(profile.image || null);
      setAvatarKey(profile.imageKey || null);
    }
  }, [profile]);

  const updateMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success("Profile updated!");
      refetch();
      setIsSaving(false);
      router.push(`/profile/${session?.user?.username}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update profile");
      setIsSaving(false);
    },
  });

  const deleteAccountMutation = trpc.profile.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("Account deleted. You will be redirected.");
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete account");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    updateMutation.mutate({
      bio: bio.trim() || null,
      website: website.trim() || null,
      location: location.trim() || null,
      github: github.trim() || null,
      twitter: twitter.trim() || null,
      linkedin: linkedin.trim() || null,
      avatarUrl: avatarUrl,
      avatarKey: avatarKey,
    } as any); // temporary workaround – run `npm run dev` after backend updates
  };

  const handleDeleteAccount = () => {
    if (
      confirm(
        "Are you sure you want to delete your account? This action is irreversible and will remove all your data."
      )
    ) {
      if (confirm("This will also cancel all your subscriptions. Continue?")) {
        deleteAccountMutation.mutate();
      }
    }
  };

  if (sessionLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-border)]" />
        <div className="mt-6 space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-[var(--color-border)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10">
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
            You need to be signed in
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Sign in to edit your profile.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Header — matches the community settings page pattern: back link,
          title/description on the left, primary Save action top-right. */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/profile/${session.user.username}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 text-current" />
            Back to profile
          </Link>
          <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
            Edit Profile
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Update your personal information and avatar.
          </p>
        </div>
        <button
          type="submit"
          form="edit-profile-form"
          disabled={isSaving}
          className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          <FontAwesomeIcon icon={faSave} className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <form id="edit-profile-form" onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Avatar */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h3 className="font-semibold text-[var(--color-text-primary)]">Avatar</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            A clear photo helps people recognize you across the community.
          </p>

          <div className="mt-4 flex items-center gap-4">
            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-2 border-[var(--color-border)]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                  <FontAwesomeIcon icon={faUser} className="h-8 w-8" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <FileUploader
                  uploadType="image"
                  accept="image/*"
                  maxSize={5}
                  onUploadSuccess={(url, key) => {
                    setAvatarUrl(url);
                    setAvatarKey(key);
                    toast.success("Avatar uploaded!");
                  }}
                  onUploadError={(err) => toast.error(err)}
                  buttonText={avatarUrl ? "Change" : "Upload"}
                />
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarUrl(null);
                      setAvatarKey(null);
                    }}
                    aria-label="Remove avatar"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:border-red-300 hover:text-red-500"
                  >
                    <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
                Square, at least 200×200px. JPG or PNG, up to 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* About you */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h3 className="font-semibold text-[var(--color-text-primary)]">About You</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Tell the community a bit about who you are.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="bio" className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Tell people about yourself..."
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              />
              <p className="mt-1 text-right text-xs text-[var(--color-text-secondary)]">{bio.length}/500</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="location" className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                  <FontAwesomeIcon icon={faLocationDot} className="mr-1.5 h-3.5 w-3.5" />
                  Location
                </label>
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={100}
                  placeholder="City, Country"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                />
              </div>
              <div>
                <label htmlFor="website" className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                  <FontAwesomeIcon icon={faGlobe} className="mr-1.5 h-3.5 w-3.5" />
                  Website
                </label>
                <input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Social links — grouped together with brand icons and a
            consistent "handle" input style instead of plain text fields. */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h3 className="font-semibold text-[var(--color-text-primary)]">Social Links</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Let people find you elsewhere.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="github" className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                GitHub
              </label>
              <div className="flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] transition-colors focus-within:border-[var(--color-accent)]">
                <span className="flex items-center gap-1.5 border-r border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-secondary)]">
                  <FontAwesomeIcon icon={faLink} className="h-3.5 w-3.5" />
                  github.com/
                </span>
                <input
                  id="github"
                  type="text"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  maxLength={50}
                  placeholder="username"
                  className="w-full bg-transparent px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="twitter" className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                X (Twitter)
              </label>
              <div className="flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] transition-colors focus-within:border-[var(--color-accent)]">
                <span className="flex items-center gap-1.5 border-r border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-secondary)]">
                  <FontAwesomeIcon icon={faLink} className="h-3.5 w-3.5" />
                  x.com/
                </span>
                <input
                  id="twitter"
                  type="text"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  maxLength={50}
                  placeholder="username"
                  className="w-full bg-transparent px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="linkedin" className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                LinkedIn
              </label>
              <div className="flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] transition-colors focus-within:border-[var(--color-accent)]">
                <span className="flex items-center gap-1.5 border-r border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-secondary)]">
                  <FontAwesomeIcon icon={faLink} className="h-3.5 w-3.5" />
                  linkedin.com/in/
                </span>
                <input
                  id="linkedin"
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full bg-transparent px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cancel sits with the form, Save stays pinned at the top */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => router.push(`/profile/${session.user.username}`)}
            disabled={isSaving}
            className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-6">
        <h3 className="font-semibold text-red-500">Danger Zone</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Permanently delete your account and all associated data.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={deleteAccountMutation.isPending}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
          {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
        </button>
      </div>
    </div>
  );
}