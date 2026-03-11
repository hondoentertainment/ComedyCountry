import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import MarketingDashboard from "@/components/MarketingDashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Marketing Suite | Punchline Atlas",
  description: "SMS campaigns, audience segments, referrals, A/B tests, and influencer matching.",
};

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: { venueId?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const venueId = searchParams.venueId ?? "";

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Marketing Suite</h1>
          <p className="text-zinc-400 text-sm">
            Grow your audience with SMS campaigns, referral programs, A/B testing, and more.
          </p>
        </div>

        {!venueId ? (
          <div className="rounded-xl border border-zinc-800/80 bg-brand-surface py-12 text-center">
            <p className="text-zinc-500 text-lg">
              Select a venue to manage marketing.
            </p>
            <p className="text-zinc-600 text-sm mt-1">
              Add ?venueId=your-venue-id to the URL.
            </p>
          </div>
        ) : (
          <MarketingDashboard venueId={venueId} />
        )}
      </div>
    </div>
  );
}
