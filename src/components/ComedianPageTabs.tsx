"use client";

import { useState } from "react";
import { ComedianTierRatingForm } from "./ComedianTierRatingForm";

type TabId = "info" | "rate";

type ComedianPageTabsProps = {
  comedianId: string;
  comedianName: string;
  comedianSlug: string;
  userTierRating: string | null;
  isSignedIn: boolean;
  infoContent: React.ReactNode;
};

export function ComedianPageTabs({
  comedianId,
  comedianName,
  comedianSlug,
  userTierRating,
  isSignedIn,
  infoContent,
}: ComedianPageTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("info");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Comedian page sections"
        className="flex gap-1 border-b border-zinc-800 mb-6"
      >
        <button
          role="tab"
          aria-selected={activeTab === "info"}
          aria-controls="comedian-info-panel"
          id="tab-info"
          onClick={() => setActiveTab("info")}
          className={`px-4 py-3 text-sm font-medium transition-colors -mb-px border-b-2 ${
            activeTab === "info"
              ? "text-brand-gold border-brand-gold"
              : "text-zinc-400 border-transparent hover:text-zinc-300"
          }`}
        >
          Info
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "rate"}
          aria-controls="comedian-rate-panel"
          id="tab-rate"
          onClick={() => setActiveTab("rate")}
          className={`px-4 py-3 text-sm font-medium transition-colors -mb-px border-b-2 ${
            activeTab === "rate"
              ? "text-brand-gold border-brand-gold"
              : "text-zinc-400 border-transparent hover:text-zinc-300"
          }`}
        >
          Rate
        </button>
      </div>

      <div
        role="tabpanel"
        id="comedian-info-panel"
        aria-labelledby="tab-info"
        hidden={activeTab !== "info"}
        className={activeTab !== "info" ? "sr-only" : ""}
      >
        {infoContent}
      </div>

      <div
        role="tabpanel"
        id="comedian-rate-panel"
        aria-labelledby="tab-rate"
        hidden={activeTab !== "rate"}
        className={activeTab !== "rate" ? "sr-only" : ""}
      >
        <div className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
          <h2 className="text-lg font-semibold text-white mb-4">
            Tier rating
          </h2>
          {isSignedIn ? (
            <ComedianTierRatingForm
              comedianId={comedianId}
              comedianName={comedianName}
              comedianSlug={comedianSlug}
              initialTier={userTierRating}
            />
          ) : (
            <>
              <p className="text-zinc-400 text-sm mb-4">
                Sign in to rate this comedian with a tier (S, A, B, C, D, F).
              </p>
              <a
                href={`/auth/signin?callbackUrl=${encodeURIComponent(`/comedians/${comedianSlug}`)}`}
                className="inline-block px-4 py-2 rounded-md bg-brand-gold text-brand-dark font-medium hover:bg-brand-gold/90"
              >
                Sign in
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
