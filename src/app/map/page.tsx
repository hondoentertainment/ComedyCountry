import nextDynamic from "next/dynamic";
import {
  listVenuesWithCoordinates,
  getVenueStatesWithCoordinates,
} from "@/lib/venues";

const MapPageContent = nextDynamic(
  () =>
    import("@/components/MapPageContent").then((m) => ({
      default: m.MapPageContent,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-video rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500">
        Loading map…
      </div>
    ),
  }
);

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ state?: string; city?: string; q?: string }>;
};

export default async function MapPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { state, city, q: search } = params;

  let venues: Awaited<ReturnType<typeof listVenuesWithCoordinates>> = [];
  let states: Awaited<ReturnType<typeof getVenueStatesWithCoordinates>> = [];

  try {
    [venues, states] = await Promise.all([
      listVenuesWithCoordinates({ state, city, search }),
      getVenueStatesWithCoordinates(),
    ]);
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
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-2">Map</h1>
        <p className="text-zinc-400 mb-8">
          Browse comedy venues across the country. Click a marker for details.
        </p>
        <MapPageContent
          venues={venuesForMap}
          states={states.map((s) => s.state)}
          initialState={state ?? ""}
          initialCity={city ?? ""}
          initialSearch={search ?? ""}
        />
      </div>
    </div>
  );
}
