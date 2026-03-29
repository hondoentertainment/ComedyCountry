"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import ReviewReactions from "./ReviewReactions";
import ReportButton from "./ReportButton";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    profileName: string | null;
    name: string | null;
    image: string | null;
  };
}

export function VenueReviews({ venueId }: { venueId: string }) {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`/api/venues/${venueId}/reviews?page=${page}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
        setAvgRating(data.avgRating);
        setCount(data.count);
        setPages(data.pages);
      }
    } catch {
      // ignore
    }
  }, [venueId, page]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!myRating) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/venues/${venueId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: myRating,
          comment: myComment.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit review");
      setShowForm(false);
      setMyRating(0);
      setMyComment("");
      await fetchReviews();
    } catch {
      setError("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteReview(reviewId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/venues/${venueId}/reviews`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove review");
      await fetchReviews();
    } catch {
      setError("Failed to remove review. Please try again.");
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Reviews</h2>
          {avgRating !== null && count > 0 && (
            <p className="text-zinc-500 text-sm">
              {avgRating.toFixed(1)} avg &middot; {count} review
              {count !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {session && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-1.5 rounded-lg bg-brand-surface border border-zinc-700 text-zinc-300 text-sm hover:border-zinc-600 transition-colors"
          >
            Write a review
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400 mb-4" role="alert">
          {error}
        </p>
      )}

      {/* Review Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-4 rounded-lg bg-brand-surface border border-zinc-800 mb-4"
        >
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setMyRating(star)}
                className={`text-2xl transition-colors ${star <= myRating ? "text-brand-gold" : "text-zinc-700 hover:text-zinc-500"}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={myComment}
            onChange={(e) => setMyComment(e.target.value)}
            placeholder="Share your experience (optional)"
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-brand-charcoal px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-brand-gold focus:outline-none resize-none mb-3"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!myRating || submitting}
              className="px-4 py-1.5 rounded-lg bg-brand-gold text-brand-dark text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-1.5 rounded-lg text-zinc-400 text-sm hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-3">
        {reviews.map((r) => (
          <div
            key={r.id}
            className="p-4 rounded-lg bg-brand-surface border border-zinc-800"
          >
            <div className="flex items-center gap-3 mb-2">
              {r.user.image ? (
                <Image
                  src={r.user.image}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-full"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-brand-charcoal flex items-center justify-center text-zinc-600 text-xs">
                  {(r.user.profileName || r.user.name || "?").charAt(0)}
                </div>
              )}
              <span className="text-zinc-300 text-sm font-medium">
                {r.user.profileName || r.user.name || "Anonymous"}
              </span>
              <span className="text-brand-gold text-sm">
                {"★".repeat(r.rating)}
              </span>
              <span className="text-zinc-600 text-xs ml-auto">
                {new Date(r.createdAt).toLocaleDateString()}
              </span>
            </div>
            {r.comment && <p className="text-zinc-400 text-sm">{r.comment}</p>}
            <div className="mt-3 flex items-center gap-3">
              <ReviewReactions reviewType="venue_review" reviewId={r.id} />
              <ReportButton entityType="venue_review" entityId={r.id} />
              {session?.user &&
                (r.user.profileName === session.user.name ||
                  r.user.name === session.user.name) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteReview(r.id)}
                    className="text-xs text-zinc-500 hover:text-red-400 underline"
                  >
                    Delete
                  </button>
                )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded text-sm text-zinc-400 hover:text-white disabled:opacity-30"
          >
            Prev
          </button>
          <span className="text-zinc-500 text-sm py-1">
            {page} / {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3 py-1 rounded text-sm text-zinc-400 hover:text-white disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}

      {reviews.length === 0 && !showForm && (
        <p className="text-zinc-600 text-sm">No reviews yet. Be the first!</p>
      )}
    </section>
  );
}
