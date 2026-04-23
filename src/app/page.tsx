import Link from "next/link";
import { Suspense } from "react";
import { HomeSections } from "./HomeSections";
import { HomeHeroActions } from "@/components/HomeHeroActions";
import { HomeMarketSpotlight } from "@/components/HomeMarketSpotlight";

export const dynamic = "force-dynamic";

function HomeSectionsFallback() {
  return (
    <div
      className="mx-auto max-w-6xl px-4 pb-16 sm:px-6"
      role="status"
      aria-label="Loading content"
      aria-busy
    >
      {/* Skeleton for Made for you / Upcoming / Explore — shown while session and data load */}
      <div className="mb-14">
        <div className="h-8 w-40 bg-zinc-800 rounded animate-pulse mb-4" />
        <div className="h-4 w-56 bg-zinc-800 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-lg bg-zinc-800 animate-pulse" />
          ))}
        </div>
      </div>
      <div className="mb-14">
        <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse mb-4" />
        <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-zinc-800 animate-pulse" />
          ))}
        </div>
      </div>
      <div className="mb-14">
        <div className="h-8 w-40 bg-zinc-800 rounded animate-pulse mb-4" />
        <div className="h-4 w-56 bg-zinc-800 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[16/10] rounded-lg bg-zinc-800 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-b from-brand-charcoal/80 to-transparent">
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">
            Find the right comedy night. <span className="text-brand-gold">Fast.</span>
          </h1>
          <p className="text-zinc-400 text-lg mb-8 max-w-xl">
            Start local, see what is worth leaving the house for, and keep up with the comedians and venues you actually care about.
          </p>
          <HomeHeroActions />
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-zinc-500">
            <Link href="/feed" className="hover:text-zinc-300 transition-colors">
              Follow updates from your favorites
            </Link>
            <Link href="/settings" className="hover:text-zinc-300 transition-colors">
              Set reminders and location alerts
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <HomeMarketSpotlight />
      </div>

      <Suspense fallback={<HomeSectionsFallback />}>
        <HomeSections />
      </Suspense>
    </div>
  );
}
