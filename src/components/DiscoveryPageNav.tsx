"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  buildPreferredLocationHref,
  formatPreferredLocation,
  readPreferredLocation,
  type PreferredLocation,
} from "@/lib/preferred-location";

const TABS = [
  {
    href: "/discover",
    label: "Discover",
    description: "Taste, friends, and momentum",
  },
  {
    href: "/for-you",
    label: "For You",
    description: "Direct personalized picks",
  },
  {
    href: "/feed",
    label: "Feed",
    description: "Updates from what you follow",
  },
];

function isActive(href: string, pathname: string) {
  return pathname === href;
}

export function DiscoveryPageNav({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const pathname = usePathname();
  const [preferredLocation, setPreferredLocation] = useState<PreferredLocation | null>(null);

  useEffect(() => {
    setPreferredLocation(readPreferredLocation());
  }, []);

  return (
    <div className="mb-8 space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-brand-gold mb-2">{title}</h1>
        <p className="text-zinc-400 max-w-2xl">{description}</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-brand-surface/80 p-2">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {TABS.map((tab) => {
            const active = isActive(tab.href, pathname);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-xl border p-4 transition-colors ${
                  active
                    ? "border-brand-gold/40 bg-brand-gold/10"
                    : "border-zinc-800 bg-brand-charcoal/40 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={`font-semibold ${active ? "text-brand-gold" : "text-white"}`}>
                    {tab.label}
                  </span>
                  {active && (
                    <span className="rounded-full bg-brand-gold/15 px-2 py-0.5 text-[11px] font-medium text-brand-gold">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-zinc-500">{tab.description}</p>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 px-1 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-brand-charcoal/40 p-3">
            <p className="text-sm font-medium text-white">Taste and confidence</p>
            <p className="mt-1 text-xs text-zinc-500">
              We explain picks using your follows, reviews, and repeat behavior so this never feels random.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-brand-charcoal/40 p-3">
            <p className="text-sm font-medium text-white">Social and momentum</p>
            <p className="mt-1 text-xs text-zinc-500">
              Discover leans on friends, attendance, and heat so the app can surface what feels alive right now.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-brand-charcoal/40 p-3">
            <p className="text-sm font-medium text-white">Return loop</p>
            <p className="mt-1 text-xs text-zinc-500">
              Feed and alerts are the follow-through layer that brings you back when a comic or room moves.
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-3 px-1 text-sm">
          <Link href="/schedule" className="text-zinc-400 hover:text-zinc-200 transition-colors">
            Browse the full schedule
          </Link>
          <Link href="/settings" className="text-zinc-400 hover:text-zinc-200 transition-colors">
            Tune alerts and reminders
          </Link>
          {preferredLocation ? (
            <Link
              href={buildPreferredLocationHref("/schedule", preferredLocation)}
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Open {formatPreferredLocation(preferredLocation)}
            </Link>
          ) : (
            <Link href="/settings" className="text-zinc-400 hover:text-zinc-200 transition-colors">
              Set your home market
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
