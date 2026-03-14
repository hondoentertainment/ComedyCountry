"use client";

import { useState } from "react";
import { EventRatingForm } from "./EventRatingForm";
import { EventReviews } from "./EventReviews";

type UserReview = {
  id: string;
  rating: number;
  comment: string | null;
};

type EventReviewsSectionProps = {
  eventId: string;
  initialReview?: UserReview | null;
  initialStats?: { count: number; avgRating: number | null } | null;
  isSignedIn: boolean;
};

export function EventReviewsSection({
  eventId,
  initialReview,
  initialStats,
  isSignedIn,
}: EventReviewsSectionProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <>
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">
          Rate this show
        </h2>
        <div className="p-4 rounded-card bg-brand-surface border border-zinc-800/80">
          <p className="text-xs text-zinc-500 mb-4">
            Add a quick live-quality read so Punchline Atlas can learn what rooms and lineups actually fit your taste.
          </p>
          {isSignedIn ? (
            <EventRatingForm
              eventId={eventId}
              initialReview={initialReview}
              signInUrl={`/auth/signin?callbackUrl=${encodeURIComponent(`/events/${eventId}`)}`}
              onSuccess={() => setRefreshTrigger((t) => t + 1)}
            />
          ) : (
            <>
              <p className="text-zinc-400 text-sm mb-4">
                Sign in to rate this show and leave a comment.
              </p>
              <a
                href={`/auth/signin?callbackUrl=/events/${eventId}`}
                className="inline-block px-4 py-2 rounded-md bg-brand-gold text-brand-dark font-medium hover:bg-brand-gold/90"
              >
                Sign in
              </a>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Reviews</h2>
        <EventReviews
          eventId={eventId}
          initialStats={initialStats}
          refreshTrigger={refreshTrigger}
        />
      </section>
    </>
  );
}
