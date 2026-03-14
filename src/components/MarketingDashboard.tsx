"use client";

import { useEffect, useState } from "react";

type Tab =
  | "sms"
  | "audience"
  | "referrals"
  | "pixels"
  | "abtests"
  | "influencers";

interface SMSCampaign {
  id: string;
  name: string;
  message: string;
  status: string;
  recipientCount: number;
  deliveredCount: number;
  clickCount: number;
  createdAt: string;
}

interface AudienceSegment {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  isSystem: boolean;
}

interface ReferralStats {
  totalCodes: number;
  activeCodes: number;
  totalRedemptions: number;
  totalRevenue: number;
  codes: Array<{
    id: string;
    code: string;
    useCount: number;
    maxUses: number;
    discountValue: number;
    discountType: string;
    isActive: boolean;
  }>;
}

interface RetargetingPixel {
  id: string;
  provider: string;
  pixelId: string;
  isActive: boolean;
  events: string[];
}

interface ABTest {
  id: string;
  name: string;
  type: string;
  status: string;
  variantA: { value: string; impressions: number; conversions: number };
  variantB: { value: string; impressions: number; conversions: number };
  winner: string | null;
}

interface Influencer {
  id: string;
  influencerName: string;
  platform: string;
  followerCount: number;
  engagementRate: number;
  matchScore: number;
  status: string;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "sms", label: "SMS Campaigns" },
  { key: "audience", label: "Audience" },
  { key: "referrals", label: "Referrals" },
  { key: "pixels", label: "Pixels" },
  { key: "abtests", label: "A/B Tests" },
  { key: "influencers", label: "Influencers" },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function MarketingDashboard({ venueId }: { venueId: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("sms");
  const [loading, setLoading] = useState(false);

  // Data states
  const [campaigns, setCampaigns] = useState<SMSCampaign[]>([]);
  const [segments, setSegments] = useState<AudienceSegment[]>([]);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(
    null,
  );
  const [pixels, setPixels] = useState<RetargetingPixel[]>([]);
  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();

    async function fetchData() {
      try {
        switch (activeTab) {
          case "sms": {
            const res = await fetch(
              `/api/marketing/sms-campaigns?venueId=${venueId}`,
              { signal: controller.signal },
            );
            if (res.ok) {
              const data = await res.json();
              setCampaigns(data.campaigns ?? []);
            }
            break;
          }
          case "audience": {
            const res = await fetch(
              `/api/marketing/segments?venueId=${venueId}`,
              { signal: controller.signal },
            );
            if (res.ok) {
              const data = await res.json();
              setSegments(data.segments ?? []);
            }
            break;
          }
          case "referrals": {
            const res = await fetch("/api/marketing/referrals", {
              signal: controller.signal,
            });
            if (res.ok) {
              const data = await res.json();
              setReferralStats(data);
            }
            break;
          }
          case "pixels": {
            const res = await fetch(
              `/api/marketing/pixels?venueId=${venueId}`,
              { signal: controller.signal },
            );
            if (res.ok) {
              const data = await res.json();
              setPixels(data.pixels ?? []);
            }
            break;
          }
          case "abtests": {
            const res = await fetch(
              `/api/marketing/ab-tests?venueId=${venueId}`,
              { signal: controller.signal },
            );
            if (res.ok) {
              const data = await res.json();
              setAbTests(data.tests ?? []);
            }
            break;
          }
          case "influencers": {
            const res = await fetch(
              `/api/marketing/influencers?venueId=${venueId}`,
              { signal: controller.signal },
            );
            if (res.ok) {
              const data = await res.json();
              setInfluencers(data.influencers ?? []);
            }
            break;
          }
        }
      } catch {
        // aborted or network error
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    return () => controller.abort();
  }, [activeTab, venueId]);

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-zinc-900 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-brand-gold text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="animate-pulse space-y-3">
          <div className="h-20 rounded-xl bg-zinc-800" />
          <div className="h-20 rounded-xl bg-zinc-800" />
        </div>
      )}

      {/* SMS Campaigns */}
      {!loading && activeTab === "sms" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Campaigns" value={campaigns.length} />
            <StatCard
              label="Sent"
              value={campaigns.filter((c) => c.status === "sent").length}
            />
            <StatCard
              label="Total Delivered"
              value={campaigns.reduce((s, c) => s + c.deliveredCount, 0)}
            />
          </div>
          {campaigns.length === 0 ? (
            <EmptyState message="No SMS campaigns yet." />
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-zinc-800/80 bg-brand-surface p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-white">{c.name}</h3>
                      <p className="mt-1 text-sm text-zinc-400">{c.message}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="mt-3 flex gap-4 text-xs text-zinc-500">
                    <span>Recipients: {c.recipientCount}</span>
                    <span>Delivered: {c.deliveredCount}</span>
                    <span>Clicks: {c.clickCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audience Segments */}
      {!loading && activeTab === "audience" && (
        <div className="space-y-4">
          <StatCard label="Total Segments" value={segments.length} />
          {segments.length === 0 ? (
            <EmptyState message="No audience segments defined." />
          ) : (
            <div className="space-y-3">
              {segments.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-zinc-800/80 bg-brand-surface p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white">
                        {s.name}
                        {s.isSystem && (
                          <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                            System
                          </span>
                        )}
                      </h3>
                      {s.description && (
                        <p className="mt-1 text-sm text-zinc-400">
                          {s.description}
                        </p>
                      )}
                    </div>
                    <span className="text-lg font-semibold text-white">
                      {formatNumber(s.memberCount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Referrals */}
      {!loading && activeTab === "referrals" && (
        <div className="space-y-4">
          {referralStats ? (
            <>
              <div className="grid gap-4 sm:grid-cols-4">
                <StatCard label="Total Codes" value={referralStats.totalCodes} />
                <StatCard label="Active" value={referralStats.activeCodes} />
                <StatCard
                  label="Redemptions"
                  value={referralStats.totalRedemptions}
                />
                <StatCard
                  label="Revenue"
                  value={`$${referralStats.totalRevenue.toFixed(2)}`}
                />
              </div>
              {referralStats.codes.length === 0 ? (
                <EmptyState message="No referral codes yet." />
              ) : (
                <div className="space-y-3">
                  {referralStats.codes.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-brand-surface p-4"
                    >
                      <div>
                        <span className="font-mono text-sm font-medium text-brand-gold">
                          {c.code}
                        </span>
                        <p className="mt-1 text-xs text-zinc-400">
                          {c.discountType === "percentage"
                            ? `${c.discountValue}% off`
                            : `$${c.discountValue} off`}
                          {" · "}
                          {c.useCount}/{c.maxUses} used
                        </p>
                      </div>
                      <StatusBadge
                        status={c.isActive ? "active" : "inactive"}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <EmptyState message="No referral data available." />
          )}
        </div>
      )}

      {/* Retargeting Pixels */}
      {!loading && activeTab === "pixels" && (
        <div className="space-y-4">
          <StatCard label="Active Pixels" value={pixels.filter((p) => p.isActive).length} />
          {pixels.length === 0 ? (
            <EmptyState message="No retargeting pixels configured." />
          ) : (
            <div className="space-y-3">
              {pixels.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-brand-surface p-4"
                >
                  <div>
                    <h3 className="font-medium capitalize text-white">
                      {p.provider}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-400">
                      ID: {p.pixelId} · Events: {p.events.join(", ")}
                    </p>
                  </div>
                  <StatusBadge status={p.isActive ? "active" : "inactive"} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* A/B Tests */}
      {!loading && activeTab === "abtests" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Tests" value={abTests.length} />
            <StatCard
              label="Running"
              value={abTests.filter((t) => t.status === "running").length}
            />
            <StatCard
              label="Completed"
              value={abTests.filter((t) => t.status === "completed").length}
            />
          </div>
          {abTests.length === 0 ? (
            <EmptyState message="No A/B tests yet." />
          ) : (
            <div className="space-y-3">
              {abTests.map((t) => {
                const totalA = t.variantA.impressions;
                const totalB = t.variantB.impressions;
                const rateA =
                  totalA > 0
                    ? ((t.variantA.conversions / totalA) * 100).toFixed(1)
                    : "0";
                const rateB =
                  totalB > 0
                    ? ((t.variantB.conversions / totalB) * 100).toFixed(1)
                    : "0";

                return (
                  <div
                    key={t.id}
                    className="rounded-xl border border-zinc-800/80 bg-brand-surface p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-white">{t.name}</h3>
                        <p className="mt-1 text-xs text-zinc-400">
                          Type: {t.type}
                        </p>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      <div
                        className={`rounded-lg p-3 ${t.winner === "A" ? "border border-emerald-500/30 bg-emerald-500/10" : "bg-zinc-800/50"}`}
                      >
                        <p className="text-xs text-zinc-400">Variant A</p>
                        <p className="font-medium text-white">
                          {rateA}% conv.
                        </p>
                        <p className="text-xs text-zinc-500">
                          {t.variantA.impressions} impressions
                        </p>
                      </div>
                      <div
                        className={`rounded-lg p-3 ${t.winner === "B" ? "border border-emerald-500/30 bg-emerald-500/10" : "bg-zinc-800/50"}`}
                      >
                        <p className="text-xs text-zinc-400">Variant B</p>
                        <p className="font-medium text-white">
                          {rateB}% conv.
                        </p>
                        <p className="text-xs text-zinc-500">
                          {t.variantB.impressions} impressions
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Influencers */}
      {!loading && activeTab === "influencers" && (
        <div className="space-y-4">
          <StatCard label="Matches Found" value={influencers.length} />
          {influencers.length === 0 ? (
            <EmptyState message="No influencer matches yet." />
          ) : (
            <div className="space-y-3">
              {influencers.map((inf) => (
                <div
                  key={inf.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-brand-surface p-4"
                >
                  <div>
                    <h3 className="font-medium text-white">
                      {inf.influencerName}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-400">
                      {inf.platform} · {formatNumber(inf.followerCount)}{" "}
                      followers · {inf.engagementRate.toFixed(1)}% engagement
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-semibold text-brand-gold">
                      {inf.matchScore.toFixed(0)}
                    </span>
                    <p className="text-xs text-zinc-500">match score</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Shared sub-components ──────────────────────────────────────────── */

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-brand-surface p-4">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-zinc-800 text-zinc-400",
    scheduled: "bg-blue-900/40 text-blue-400",
    sending: "bg-yellow-900/40 text-yellow-400",
    sent: "bg-green-900/40 text-green-400",
    failed: "bg-red-900/40 text-red-400",
    running: "bg-blue-900/40 text-blue-400",
    completed: "bg-green-900/40 text-green-400",
    stopped: "bg-zinc-800 text-zinc-400",
    active: "bg-green-900/40 text-green-400",
    inactive: "bg-zinc-800 text-zinc-400",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-zinc-800 text-zinc-400"}`}
    >
      {status}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-brand-surface py-12 text-center">
      <p className="text-zinc-500">{message}</p>
    </div>
  );
}
