"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar,
  faStarHalfStroke,
  faPen,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { faStar as faStarOutline } from "@fortawesome/free-regular-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";

interface CourseReviewsProps {
  courseId: string;
  isEnrolled: boolean;
}

// Filled stars are the real solid icon in amber; empty stars are now a
// genuine outline (free-regular-svg-icons), not a gray copy of the solid
// one — that's what makes the yellow read as "filled" rather than just
// "one shade darker than the rest."
function StarRating({
  rating,
  size = "h-5 w-5",
  interactive = false,
  onChange,
}: {
  rating: number;
  size?: string;
  interactive?: boolean;
  onChange?: (value: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const display = hover || rating;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => interactive && onChange?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          disabled={!interactive}
          className={interactive ? "cursor-pointer" : "cursor-default"}
        >
          <FontAwesomeIcon
            icon={star <= display ? faStar : faStarOutline}
            className={`${size} transition-colors ${
              star <= display ? "text-amber-400" : "text-[var(--color-text-secondary)]"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// Renders a partial (half) star for non-integer averages like 4.3 — a
// small but real touch that makes the summary number feel accurate
// instead of rounding silently.
function AverageStars({ average }: { average: number }) {
  const fullStars = Math.floor(average);
  const hasHalf = average - fullStars >= 0.25 && average - fullStars < 0.75;
  const roundsUp = average - fullStars >= 0.75;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = star <= fullStars || (roundsUp && star === fullStars + 1);
        const isHalf = !isFull && hasHalf && star === fullStars + 1;
        return (
          <FontAwesomeIcon
            key={star}
            icon={isHalf ? faStarHalfStroke : isFull ? faStar : faStarOutline}
            className={`h-4 w-4 ${
              isFull || isHalf ? "text-amber-400" : "text-[var(--color-text-secondary)]"
            }`}
          />
        );
      })}
    </div>
  );
}

export function CourseReviews({ courseId, isEnrolled }: CourseReviewsProps) {
  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.review.list.useQuery(
    { courseId },
    { enabled: !!courseId }
  );

  const { data: myReview } = trpc.review.myReview.useQuery(
    { courseId },
    { enabled: !!courseId }
  );

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editRating, setEditRating] = useState(0);
  const [editReviewText, setEditReviewText] = useState("");

  const createMutation = trpc.review.create.useMutation({
    onSuccess: () => {
      toast.success("Review submitted!");
      refetch();
      utils.review.myReview.invalidate({ courseId });
      setRating(0);
      setReviewText("");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.review.update.useMutation({
    onSuccess: () => {
      toast.success("Review updated!");
      refetch();
      utils.review.myReview.invalidate({ courseId });
      setIsEditing(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    createMutation.mutate({
      courseId,
      rating,
      review: reviewText.trim() || undefined,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myReview) return;
    updateMutation.mutate({
      reviewId: myReview.id,
      rating: editRating,
      review: editReviewText.trim() || undefined,
    });
  };

  const startEdit = () => {
    if (myReview) {
      setEditRating(myReview.rating);
      setEditReviewText(myReview.review || "");
      setIsEditing(true);
    }
  };

  const cancelEdit = () => setIsEditing(false);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="h-6 w-32 animate-pulse rounded bg-[var(--color-border)]" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-[var(--color-border)]" />
          ))}
        </div>
      </div>
    );
  }

  const { reviews = [], stats } = data || {
    reviews: [],
    stats: { averageRating: 0, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
  };
  const canReview = isEnrolled && !myReview;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
        Reviews
      </h3>

      {/* Stats summary */}
      <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex flex-shrink-0 flex-col items-start sm:items-center">
          <div className="text-4xl font-bold text-[var(--color-text-primary)]">
            {stats.averageRating.toFixed(1)}
          </div>
          <div className="mt-1">
            <AverageStars average={stats.averageRating} />
          </div>
          <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {stats.totalReviews} review{stats.totalReviews !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.distribution[star as 1 | 2 | 3 | 4 | 5] || 0;
            const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-sm">
                <span className="flex w-8 items-center gap-1 text-[var(--color-text-secondary)]">
                  {star}
                  <FontAwesomeIcon icon={faStar} className="h-3 w-3 text-amber-400" />
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-bg)]">
                  <div
                    className="h-2 rounded-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-6 text-right text-xs text-[var(--color-text-secondary)]">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review form (only if enrolled and no review yet) */}
      {canReview && (
        <form onSubmit={handleSubmit} className="mt-6 border-t border-[var(--color-border)] pt-6">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">Write a review</p>
          <div className="mt-3">
            <StarRating rating={rating} size="h-7 w-7" interactive onChange={setRating} />
          </div>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={3}
            placeholder="Share your experience with this course..."
            className="mt-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="mt-3 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {createMutation.isPending ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      )}

      {/* Own review (editable) */}
      {myReview && !isEditing && (
        <div className="mt-6 rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-accent-soft)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                Your review
              </p>
              <div className="mt-1.5">
                <StarRating rating={myReview.rating} size="h-4 w-4" />
              </div>
              {myReview.review && (
                <p className="mt-2 text-sm text-[var(--color-text-primary)]">{myReview.review}</p>
              )}
              <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
                {new Date(myReview.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={startEdit}
              aria-label="Edit your review"
              className="inline-flex flex-shrink-0 h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-accent)]"
            >
              <FontAwesomeIcon icon={faPen} className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Edit own review form */}
      {isEditing && myReview && (
        <form onSubmit={handleUpdate} className="mt-6 border-t border-[var(--color-border)] pt-6">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">Edit your review</p>
          <div className="mt-3">
            <StarRating rating={editRating} size="h-7 w-7" interactive onChange={setEditRating} />
          </div>
          <textarea
            value={editReviewText}
            onChange={(e) => setEditReviewText(e.target.value)}
            rows={3}
            className="mt-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
            >
              {updateMutation.isPending ? "Saving..." : "Update"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* All reviews list */}
      <div className="mt-6 border-t border-[var(--color-border)] pt-6">
        <h4 className="text-sm font-semibold text-[var(--color-text-secondary)]">All Reviews</h4>
        {reviews.length === 0 ? (
          <div className="mt-4 flex flex-col items-center py-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-soft)]">
              <FontAwesomeIcon icon={faStarOutline} className="h-5 w-5 text-[var(--color-accent)]" />
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">No reviews yet. Be the first!</p>
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            {reviews.map((review: any) => (
              <div key={review.id} className="border-b border-[var(--color-border)] pb-4 last:border-0">
                <div className="flex items-start gap-3">
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600">
                    {review.userImage ? (
                      <img src={review.userImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white">
                        <FontAwesomeIcon icon={faUser} className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {review.userName || "Anonymous"}
                    </p>
                    <div className="mt-0.5">
                      <StarRating rating={review.rating} size="h-3.5 w-3.5" />
                    </div>
                    {review.review && (
                      <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">{review.review}</p>
                    )}
                    <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}