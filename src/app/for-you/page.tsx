"use client";

import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { logger } from "@/lib/logger";

interface RecommendedComedian {
  id: string;
  name: string;
  slug: string;
  headshotUrl: string | null;
  score: number;
  matchPct?: number;
  stretchLabel?: string;
  reason: string;
  genres: string[];
  matchingAttributes?: string[];
}

interface RecommendedEvent {
  id: string;
  title: string | null;
  date: string;
  venue: { name: string; city: string; state: string };
  comedians: Array<{ name: string; slug: string }>;
  reason: string;
  matchPct?: number;
  stretchLabel?: string;
  tags?: string[];
}

export default function ForYouPage() {
  const { data: session, status } = useSession();
  const [comedians, setComedians] = useState<RecommendedComedian[]>([]);
  const [events, setEvents] = useState<RecommendedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/recommendations")
      .then((r) => r.json())
      .then((data) => {
        setComedians(data.comedians || []);
        setEvents(data.events || []);
      })
      .catch((err: unknown) =>
        logger.error(
          "For-you recommendations fetch failed",
          "ForYou fetch failed",
          {},
          err instanceof Error ? err : undefined,
        ),
      )
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-white mb-3">For You</h1>
          <p className="text-zinc-400 mb-6">
            Sign in to get personalized comedy recommendations.
          </p>
          <Link
            href="/auth/signin?callbackUrl=/for-you"
            className="px-6 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-2">For You</h1>
        <p className="text-zinc-400 mb-8">
          Personalized picks based on your follows, reviews, and taste.
        </p>

        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-lg bg-brand-surface animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Recommended Comedians */}
            {comedians.length > 0 && (
              <section className="mb-12">
                <h2 className="text-xl font-bold text-white mb-4">
                  Comedians You Might Like
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {comedians.map((c) => (
                    <Link
                      key={c.id}
                      href={`/comedians/${c.slug}`}
                      className="p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors group"
                    >
                      {c.headshotUrl ? (
                        <Image
                          src={c.headshotUrl}
                          alt={c.name}
                          width={64}
                          height={64}
                          className="w-16 h-16 rounded-full mx-auto mb-3 object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-zinc-800 flex items-center justify-center text-zinc-600 text-xl font-bold">
                          {c.name[0]}
                        </div>
                      )}
                      <p className="text-white text-sm font-medium text-center truncate group-hover:text-brand-gold transition-colors">
                        {c.name}
                      </p>
                      <p className="text-zinc-500 text-xs text-center mt-1 line-clamp-2">
                        {c.reason}
                      </p>
                      {typeof c.matchPct === "number" && c.matchPct > 0 && (
                        <p className="text-brand-gold text-[11px] text-center mt-1">
                          {c.matchPct}% match · {c.stretchLabel ?? "core"}
                        </p>
                      )}
                      {c.genres.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1 mt-2">
                          {c.genres.slice(0, 2).map((g) => (
                            <span
                              key={g}
                              className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] capitalize"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      )}
                      {c.matchingAttributes &&
                        c.matchingAttributes.length > 0 && (
                          <p className="text-zinc-500 text-[11px] text-center mt-2">
                            {c.matchingAttributes
                              .slice(0, 2)
                              .map((attribute) => attribute.replace(/_/g, " "))
                              .join(" • ")}
                          </p>
                        )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Recommended Events */}
            {events.length > 0 && (
              <section className="mb-12">
                <h2 className="text-xl font-bold text-white mb-4">
                  Shows We Think You&apos;ll Love
                </h2>
                <div className="space-y-2">
                  {events.map((e) => {
                    const comedianNames = e.comedians
                      .map((c) => c.name)
                      .join(", ");
                    return (
                      <Link
                        key={e.id}
                        href={`/events/${e.id}`}
                        className="flex items-center justify-between p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-medium truncate">
                            {e.title || comedianNames}
                          </p>
                          <p className="text-zinc-500 text-sm truncate">
                            {e.venue.name} · {e.venue.city}, {e.venue.state}
                          </p>
                          <p className="text-zinc-600 text-xs mt-1">
                            {e.reason}
                          </p>
                          {e.tags && e.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {e.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-4 shrink-0">
                          <p className="text-zinc-400 text-sm">
                            {new Date(e.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          {typeof e.matchPct === "number" && e.matchPct > 0 && (
                            <p className="text-brand-gold text-xs">
                              {e.matchPct}% {e.stretchLabel ?? "fit"}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {comedians.length === 0 && events.length === 0 && (
              <div className="py-16 px-6 rounded-lg bg-brand-surface border border-zinc-800 border-dashed text-center">
                <p className="text-zinc-400 font-medium mb-2">
                  Not enough data for recommendations yet
                </p>
                <p className="text-zinc-500 text-sm mb-4 max-w-md mx-auto">
                  Follow some comedians, attend shows, and leave reviews to
                  unlock personalized picks.
                </p>
                <Link
                  href="/comedians"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
                >
                  Browse comedians
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
