import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedianForUser } from "@/lib/creator";
import CreatorIntelligenceDashboard from "@/components/CreatorIntelligenceDashboard";

export const metadata = {
  title: "Creator Intelligence | Punchline Atlas",
  description:
    "Unified analytics dashboard — revenue attribution, audience insights, content performance, milestones, and financial forecasting.",
};

export const dynamic = "force-dynamic";

export default async function CreatorIntelligencePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const comedian = await getComedianForUser(session.user.id);

  if (!comedian) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-4">
          Creator Intelligence
        </h1>
        <div className="p-8 rounded-lg bg-brand-surface border border-zinc-800 text-center">
          <h2 className="text-xl font-bold text-white mb-3">
            Claim Your Profile
          </h2>
          <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
            Creator Intelligence replaces 5-10 fragmented SaaS tools with one
            unified dashboard. Claim your comedian profile to unlock revenue
            attribution, audience unification, content distribution, milestone
            tracking, and financial forecasting.
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-gold">
            Creator Intelligence
          </h1>
          <p className="text-zinc-400 mt-1">
            Unified dashboard for {comedian.name}
          </p>
        </div>
        <Link
          href="/creator"
          className="text-sm text-brand-gold hover:underline"
        >
          Creator Hub &rarr;
        </Link>
      </div>

      <CreatorIntelligenceDashboard />
    </div>
  );
}
