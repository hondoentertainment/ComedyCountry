import { getHappeningTonight } from "@/lib/taste-profile";
import { HappeningTonightContent } from "./HappeningTonightContent";

export const metadata = {
  title: "Happening Tonight | Punchline Atlas",
  description: "Live comedy shows happening today and tonight near you.",
};

export const dynamic = "force-dynamic";

export default async function HappeningTonightPage({
  searchParams,
}: {
  searchParams: Promise<{ nearby?: string }>;
}) {
  const params = await searchParams;
  let events: Awaited<ReturnType<typeof getHappeningTonight>> = [];

  try {
    events = await getHappeningTonight();
  } catch {
    // DB not configured
  }

  const serialized = events.map((e) => ({
    ...e,
    date: e.date.toISOString(),
    venue: e.venue,
  }));

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-2">
          Happening Tonight
        </h1>
        <p className="text-zinc-400 mb-8">
          Live comedy shows today and tonight. Filter by location to see what&apos;s near you.
        </p>

        <HappeningTonightContent
          initialEvents={serialized}
          startNearby={params.nearby === "1"}
        />
      </div>
    </div>
  );
}
