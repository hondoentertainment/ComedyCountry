import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Marketing Dashboard | Punchline Atlas",
  description:
    "Overview of campaigns, audience segments, referrals, and growth metrics.",
};

/* ─── Stat card helper ────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  change,
  href,
}: {
  label: string;
  value: string | number;
  change?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-zinc-800/80 bg-brand-surface p-5 transition-colors hover:border-zinc-700">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {change && (
        <p
          className={`mt-1 text-xs font-medium ${change.startsWith("+") ? "text-emerald-400" : change.startsWith("-") ? "text-red-400" : "text-zinc-500"}`}
        >
          {change}
        </p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

/* ─── Section heading ─────────────────────────────────────────────────── */

function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {action && (
        <Link
          href={action.href}
          className="text-xs font-medium text-brand-gold hover:underline"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────── */

export default async function MarketingDashboardPage({
  searchParams,
}: {
  searchParams: { venueId?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const venueId = searchParams.venueId ?? "";

  if (!venueId) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Marketing Dashboard
          </h1>
          <div className="rounded-xl border border-zinc-800/80 bg-brand-surface py-16 text-center">
            <p className="text-zinc-500 text-lg">
              Select a venue to view marketing dashboard.
            </p>
            <p className="text-zinc-600 text-sm mt-1">
              Add ?venueId=your-venue-id to the URL.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch all data in parallel
  const [
    venue,
    smsCampaigns,
    segments,
    subscriberCount,
    referralCodes,
    abTests,
    pixels,
    influencers,
    followUps,
  ] = await Promise.all([
    prisma.venue.findUnique({ where: { id: venueId }, select: { id: true, name: true } }),
    prisma.sMSCampaign.findMany({
      where: { venueId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.audienceSegment.findMany({
      where: { OR: [{ venueId }, { venueId: null, isSystem: true }] },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sMSSubscriber.count({ where: { venueId, optedIn: true } }),
    prisma.referralCode.findMany({
      where: { venueId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.aBTest.findMany({
      where: { venueId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.retargetingPixel.findMany({ where: { venueId } }),
    prisma.influencerMatch.findMany({
      where: { venueId },
      orderBy: { matchScore: "desc" },
      take: 5,
    }),
    prisma.followUpSequence.findMany({
      where: { venueId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  if (!venue) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="rounded-xl border border-red-900/40 bg-red-950/20 py-12 text-center">
            <p className="text-red-400">Venue not found.</p>
          </div>
        </div>
      </div>
    );
  }

  // Compute aggregate stats
  const totalDelivered = smsCampaigns.reduce(
    (sum: number, c: { deliveredCount: number }) => sum + c.deliveredCount,
    0,
  );
  const totalClicks = smsCampaigns.reduce((sum: number, c: { clickCount: number }) => sum + c.clickCount, 0);
  const overallClickRate =
    totalDelivered > 0
      ? `${((totalClicks / totalDelivered) * 100).toFixed(1)}%`
      : "0%";

  const activeCampaigns = smsCampaigns.filter(
    (c: { status: string }) => c.status === "sending" || c.status === "scheduled",
  ).length;

  const runningTests = abTests.filter((t: { status: string }) => t.status === "running").length;
  const activePixels = pixels.filter((p: { isActive: boolean }) => p.isActive).length;

  const totalReferralRedemptions = referralCodes.reduce(
    (sum: number, c: { useCount: number }) => sum + c.useCount,
    0,
  );
  const totalReferralRevenue = referralCodes.reduce(
    (sum: number, c: { revenue: number }) => sum + c.revenue,
    0,
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Marketing Dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-400">{venue.name}</p>
          </div>
          <Link
            href={`/marketing?venueId=${venueId}`}
            className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-gold/90 transition-colors"
          >
            Full Marketing Suite
          </Link>
        </div>

        {/* Overview stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="SMS Subscribers"
            value={subscriberCount.toLocaleString()}
          />
          <StatCard
            label="Active Campaigns"
            value={activeCampaigns}
          />
          <StatCard
            label="Overall Click Rate"
            value={overallClickRate}
          />
          <StatCard
            label="Audience Segments"
            value={segments.length}
          />
        </div>

        {/* Second row stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Referral Redemptions"
            value={totalReferralRedemptions}
          />
          <StatCard
            label="Referral Revenue"
            value={`$${totalReferralRevenue.toFixed(2)}`}
          />
          <StatCard
            label="A/B Tests Running"
            value={runningTests}
          />
          <StatCard
            label="Active Pixels"
            value={activePixels}
          />
        </div>

        {/* Recent SMS Campaigns */}
        <section className="space-y-4">
          <SectionHeading
            title="Recent SMS Campaigns"
            action={{
              label: "View all",
              href: `/marketing?venueId=${venueId}`,
            }}
          />
          {smsCampaigns.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/80 bg-brand-surface py-10 text-center">
              <p className="text-zinc-500">No SMS campaigns yet.</p>
              <p className="text-zinc-600 text-xs mt-1">
                Create your first campaign to start engaging your audience.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {smsCampaigns.map((campaign: any) => {
                const deliveryRate =
                  campaign.recipientCount > 0
                    ? (
                        (campaign.deliveredCount / campaign.recipientCount) *
                        100
                      ).toFixed(1)
                    : "0";

                return (
                  <div
                    key={campaign.id}
                    className="rounded-xl border border-zinc-800/80 bg-brand-surface p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-white truncate">
                          {campaign.name}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-400 line-clamp-1">
                          {campaign.message}
                        </p>
                      </div>
                      <span
                        className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          campaign.status === "sent"
                            ? "bg-green-900/40 text-green-400"
                            : campaign.status === "sending"
                              ? "bg-yellow-900/40 text-yellow-400"
                              : campaign.status === "scheduled"
                                ? "bg-blue-900/40 text-blue-400"
                                : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-4 text-xs text-zinc-500">
                      <span>Recipients: {campaign.recipientCount}</span>
                      <span>Delivered: {campaign.deliveredCount}</span>
                      <span>Delivery: {deliveryRate}%</span>
                      <span>Clicks: {campaign.clickCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Audience Segments */}
        <section className="space-y-4">
          <SectionHeading
            title="Audience Segments"
            action={{
              label: "Manage segments",
              href: `/marketing?venueId=${venueId}`,
            }}
          />
          {segments.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/80 bg-brand-surface py-10 text-center">
              <p className="text-zinc-500">No audience segments defined.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {segments.map((segment: any) => (
                <div
                  key={segment.id}
                  className="rounded-xl border border-zinc-800/80 bg-brand-surface p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white truncate">
                      {segment.name}
                    </h3>
                    {segment.isSystem && (
                      <span className="ml-2 shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                        System
                      </span>
                    )}
                  </div>
                  {segment.description && (
                    <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
                      {segment.description}
                    </p>
                  )}
                  <p className="mt-2 text-lg font-semibold text-white">
                    {segment.memberCount.toLocaleString()}{" "}
                    <span className="text-xs font-normal text-zinc-500">
                      members
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* A/B Tests */}
        <section className="space-y-4">
          <SectionHeading
            title="A/B Tests"
            action={{
              label: "View all",
              href: `/marketing?venueId=${venueId}`,
            }}
          />
          {abTests.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/80 bg-brand-surface py-10 text-center">
              <p className="text-zinc-500">No A/B tests configured.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {abTests.map((test: any) => {
                const vA = test.variantA as {
                  value: string;
                  impressions: number;
                  conversions: number;
                };
                const vB = test.variantB as {
                  value: string;
                  impressions: number;
                  conversions: number;
                };
                const rateA =
                  vA.impressions > 0
                    ? ((vA.conversions / vA.impressions) * 100).toFixed(1)
                    : "0";
                const rateB =
                  vB.impressions > 0
                    ? ((vB.conversions / vB.impressions) * 100).toFixed(1)
                    : "0";

                return (
                  <div
                    key={test.id}
                    className="rounded-xl border border-zinc-800/80 bg-brand-surface p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-white">{test.name}</h3>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          Type: {test.type}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          test.status === "running"
                            ? "bg-blue-900/40 text-blue-400"
                            : test.status === "completed"
                              ? "bg-green-900/40 text-green-400"
                              : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {test.status}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-zinc-800/50 p-3">
                        <p className="text-xs text-zinc-400">Variant A</p>
                        <p className="font-medium text-white">{rateA}% conv.</p>
                        <p className="text-xs text-zinc-500">
                          {vA.impressions} impressions
                        </p>
                      </div>
                      <div className="rounded-lg bg-zinc-800/50 p-3">
                        <p className="text-xs text-zinc-400">Variant B</p>
                        <p className="font-medium text-white">{rateB}% conv.</p>
                        <p className="text-xs text-zinc-500">
                          {vB.impressions} impressions
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Follow-up Sequences & Influencer Matches */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Follow-up Sequences */}
          <section className="space-y-4">
            <SectionHeading title="Follow-up Sequences" />
            {followUps.length === 0 ? (
              <div className="rounded-xl border border-zinc-800/80 bg-brand-surface py-10 text-center">
                <p className="text-zinc-500">No follow-up sequences.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {followUps.map((seq: any) => {
                  const steps = (seq.steps as Array<{ channel: string }>) ?? [];
                  return (
                    <div
                      key={seq.id}
                      className="rounded-xl border border-zinc-800/80 bg-brand-surface p-4"
                    >
                      <h3 className="font-medium text-white">{seq.name}</h3>
                      <p className="mt-1 text-xs text-zinc-400">
                        Trigger: {seq.triggerEvent} &middot; {steps.length} step
                        {steps.length !== 1 ? "s" : ""}
                      </p>
                      <div className="mt-2 flex gap-1">
                        {steps.slice(0, 5).map((step, i) => (
                          <span
                            key={i}
                            className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400"
                          >
                            {step.channel}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Influencer Matches */}
          <section className="space-y-4">
            <SectionHeading title="Top Influencer Matches" />
            {influencers.length === 0 ? (
              <div className="rounded-xl border border-zinc-800/80 bg-brand-surface py-10 text-center">
                <p className="text-zinc-500">No influencer matches.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {influencers.map((inf: any) => (
                  <div
                    key={inf.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-brand-surface p-4"
                  >
                    <div>
                      <h3 className="font-medium text-white">
                        {inf.influencerName}
                      </h3>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        {inf.platform} &middot;{" "}
                        {inf.followerCount >= 1_000_000
                          ? `${(inf.followerCount / 1_000_000).toFixed(1)}M`
                          : inf.followerCount >= 1_000
                            ? `${(inf.followerCount / 1_000).toFixed(1)}K`
                            : inf.followerCount}{" "}
                        followers &middot; {inf.engagementRate.toFixed(1)}% eng.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-semibold text-brand-gold">
                        {inf.matchScore.toFixed(0)}
                      </span>
                      <p className="text-xs text-zinc-500">score</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Retargeting Pixels */}
        <section className="space-y-4">
          <SectionHeading title="Retargeting Pixels" />
          {pixels.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/80 bg-brand-surface py-10 text-center">
              <p className="text-zinc-500">No retargeting pixels configured.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pixels.map((pixel: any) => (
                <div
                  key={pixel.id}
                  className="rounded-xl border border-zinc-800/80 bg-brand-surface p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium capitalize text-white">
                      {pixel.provider}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        pixel.isActive
                          ? "bg-green-900/40 text-green-400"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {pixel.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    ID: {pixel.pixelId}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Events: {pixel.events.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
