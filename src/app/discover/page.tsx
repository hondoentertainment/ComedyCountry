"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { DiscoveryFeed } from "@/components/DiscoveryFeed";

export default function DiscoverPage() {
  const { status } = useSession();

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-white mb-3">Discover</h1>
          <p className="text-zinc-400 mb-6">
            Sign in to unlock your personalized comedy discovery feed.
          </p>
          <Link
            href="/auth/signin?callbackUrl=/discover"
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
        <h1 className="text-3xl font-bold text-brand-gold mb-2">Discover</h1>
        <p className="text-zinc-400 mb-8">
          Your personalized comedy discovery feed powered by your taste, friends,
          and what&apos;s trending.
        </p>

        {status === "loading" ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 rounded-lg bg-brand-surface animate-pulse"
              />
            ))}
          </div>
        ) : (
          <DiscoveryFeed />
        )}
      </div>
    </div>
  );
}
