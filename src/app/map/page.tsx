import dynamic from "next/dynamic";
import { listVenuesWithCoordinates } from "@/lib/venues";

const VenueMap = dynamic(
  () => import("@/components/VenueMap").then((m) => ({ default: m.VenueMap })),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-video rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500">
        Loading map…
      </div>
    ),
  }
);

export const revalidate = 60;

export default async function MapPage() {
  let venues: Awaited<ReturnType<typeof listVenuesWithCoordinates>> = [];

  try {
    venues = await listVenuesWithCoordinates();
  } catch {
    // DB not configured
  }

  const venuesForMap = venues.map((v) => ({
    id: v.id,
    name: v.name,
    address: v.address,
    city: v.city,
    state: v.state,
    latitude: v.latitude,
    longitude: v.longitude,
  }));

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-2">Map</h1>
        <p className="text-zinc-400 mb-8">
          Browse comedy venues across the country. Click a marker for details.
        </p>
        <VenueMap venues={venuesForMap} />
      </div>
    </main>
  );
}
