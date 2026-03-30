"use client";

import { useState, useRef, useCallback } from "react";
import { ComedianTierRatingForm } from "./ComedianTierRatingForm";
import { TierDistribution } from "./RatingDistribution";

type TabId = "info" | "rate";

type ComedianPageTabsProps = {
  comedianId: string;
  comedianName: string;
  comedianSlug: string;
  userTierRating: string | null;
  isSignedIn: boolean;
  infoContent: React.ReactNode;
  tierDistribution?: Record<string, number>;
  tierTotal?: number;
};

export function ComedianPageTabs({
  comedianId,
  comedianName,
  comedianSlug,
  userTierRating,
  isSignedIn,
  infoContent,
  tierDistribution,
  tierTotal,
}: ComedianPageTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("info");
  const infoRef = useRef<HTMLButtonElement>(null);
  const rateRef = useRef<HTMLButtonElement>(null);

  const focusTab = useCallback((tab: TabId) => {
    (tab === "info" ? infoRef : rateRef).current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentTab: TabId) => {
      let nextTab: TabId | null = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextTab = currentTab === "info" ? "rate" : "info";
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        nextTab = currentTab === "rate" ? "info" : "rate";
      } else if (e.key === "Home") {
        e.preventDefault();
        nextTab = "info";
      } else if (e.key === "End") {
        e.preventDefault();
        nextTab = "rate";
      }
      if (nextTab) {
        setActiveTab(nextTab);
        focusTab(nextTab);
      }
    },
    [focusTab],
  );

  return (
    <div>
      <div
        role="tablist"
        aria-label="Comedian page sections"
        className="flex gap-1 border-b border-zinc-800 mb-6"
      >
        <button
          ref={infoRef}
          type="button"
          role="tab"
          aria-selected={activeTab === "info"}
          aria-controls="comedian-info-panel"
          id="tab-info"
          tabIndex={activeTab === "info" ? 0 : -1}
          onClick={() => setActiveTab("info")}
          onKeyDown={(e) => handleKeyDown(e, "info")}
          className={`px-4 py-3 text-sm font-medium transition-colors -mb-px border-b-2 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 focus:ring-offset-brand-dark rounded-t ${
            activeTab === "info"
              ? "text-brand-gold border-brand-gold"
              : "text-zinc-400 border-transparent hover:text-zinc-300"
          }`}
        >
          Info
        </button>
        <button
          ref={rateRef}
          type="button"
          role="tab"
          aria-selected={activeTab === "rate"}
          aria-controls="comedian-rate-panel"
          id="tab-rate"
          tabIndex={activeTab === "rate" ? 0 : -1}
          onClick={() => setActiveTab("rate")}
          onKeyDown={(e) => handleKeyDown(e, "rate")}
          className={`px-4 py-3 text-sm font-medium transition-colors -mb-px border-b-2 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 focus:ring-offset-brand-dark rounded-t ${
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
        tabIndex={activeTab === "info" ? 0 : -1}
        className={activeTab !== "info" ? "sr-only" : ""}
      >
        {infoContent}
      </div>

      <div
        role="tabpanel"
        id="comedian-rate-panel"
        aria-labelledby="tab-rate"
        hidden={activeTab !== "rate"}
        tabIndex={activeTab === "rate" ? 0 : -1}
        className={activeTab !== "rate" ? "sr-only" : ""}
      >
        <div className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
          <h2 className="text-lg font-semibold text-white mb-4">Tier rating</h2>
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
          {tierDistribution && tierTotal != null && tierTotal > 0 && (
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-300 mb-3">
                Community ratings ({tierTotal} total)
              </h3>
              <TierDistribution
                distribution={tierDistribution}
                total={tierTotal}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
