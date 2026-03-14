import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";

export const metadata = {
  title: "Comedy Analytics | Punchline Atlas",
  description:
    "Comedy analytics engine — performance metrics, audience heatmaps, revenue forecasts, venue benchmarks, and industry trends.",
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ comedianId?: string; venueId?: string; eventId?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/analytics");
  }

  const params = await searchParams;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-2">
          Comedy Analytics
        </h1>
        <p className="text-zinc-400 mb-8">
          Performance metrics, audience insights, revenue forecasts, and
          industry trends.
        </p>

        <AnalyticsDashboard
          comedianId={params.comedianId}
          venueId={params.venueId}
          eventId={params.eventId}
        />
      </div>
    </div>
  );
}
