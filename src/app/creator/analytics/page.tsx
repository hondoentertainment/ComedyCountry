import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedianForUser } from "@/lib/creator";
import CreatorAnalytics from "@/components/CreatorAnalytics";
import CreatorRevenueChart from "@/components/CreatorRevenueChart";
import CreatorAudienceInsights from "@/components/CreatorAudienceInsights";

export const metadata = {
  title: "Analytics | Creator Hub | Punchline Atlas",
  description: "Track your performance, revenue, and audience growth.",
};

export const dynamic = "force-dynamic";

export default async function CreatorAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const comedian = await getComedianForUser(session.user.id);

  if (!comedian) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/creator" className="text-sm text-zinc-500 hover:text-zinc-300 mb-1 block">
          &larr; Creator Hub
        </Link>
        <h1 className="text-2xl font-bold text-brand-gold mb-6">Analytics</h1>
        <div className="p-8 rounded-lg bg-brand-surface border border-zinc-800 text-center">
          <h2 className="text-xl font-bold text-white mb-3">Claim Your Profile</h2>
          <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
            Claim your comedian profile to access analytics, revenue tracking, and audience insights.
          </p>
          <Link
            href="/comedian-dashboard/claim"
            className="inline-block px-6 py-3 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
          >
            Claim your profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/creator" className="text-sm text-zinc-500 hover:text-zinc-300 mb-1 block">
        &larr; Creator Hub
      </Link>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-gold">Analytics</h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Performance data for {comedian.name}
          </p>
        </div>
        <Link
          href={`/comedians/${comedian.slug}`}
          className="text-sm text-brand-gold hover:underline"
        >
          View public profile &rarr;
        </Link>
      </div>

      {/* Overview & Trends */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-4">Overview</h2>
        <CreatorAnalytics comedianId={comedian.id} />
      </section>

      {/* Revenue Breakdown */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-4">Revenue</h2>
        <CreatorRevenueChart comedianId={comedian.id} />
      </section>

      {/* Audience Insights */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4">Audience</h2>
        <CreatorAudienceInsights comedianId={comedian.id} />
      </section>
    </div>
  );
}
