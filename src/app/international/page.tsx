import Link from "next/link";
import { prisma } from "@/lib/prisma";
import InternationalSceneCard from "@/components/InternationalSceneCard";
import FestivalCard from "@/components/FestivalCard";
import CurrencyConverter from "@/components/CurrencyConverter";

export const metadata = {
  title: "Comedy Around the World | Punchline Atlas",
  description:
    "Discover international comedy scenes, festivals, and comedy styles from around the globe.",
};

export default async function InternationalPage() {
  let scenes: Array<{
    id: string;
    city: string;
    country: string;
    countryCode: string;
    region: string | null;
    description: string | null;
    language: string;
    currency: string;
    venueCount: number;
    comedianCount: number;
    imageUrl: string | null;
    festivals: { id: string }[];
  }> = [];
  let upcomingFestivals: Array<{
    id: string;
    name: string;
    city: string;
    country: string;
    countryCode: string;
    startDate: Date | null;
    endDate: Date | null;
    category: string;
    showCount: number;
    attendeeCapacity: number | null;
    website: string | null;
    description: string | null;
    imageUrl: string | null;
  }> = [];
  let comedyStyles: Array<{
    id: string;
    name: string;
    country: string;
    description: string;
    examples: string[];
  }> = [];

  try {
    const [scenesData, festivalsData, stylesData] = await Promise.all([
      prisma.internationalScene.findMany({
        where: { isActive: true },
        include: { festivals: { select: { id: true } } },
        orderBy: { city: "asc" },
      }),
      prisma.festivalCircuit.findMany({
        where: { startDate: { gte: new Date() } },
        orderBy: { startDate: "asc" },
        take: 6,
      }),
      prisma.comedyStyle.findMany({ orderBy: { name: "asc" } }),
    ]);
    scenes = scenesData as typeof scenes;
    upcomingFestivals = festivalsData as typeof upcomingFestivals;
    comedyStyles = stylesData as typeof comedyStyles;
  } catch {
    // DB not configured
  }

  return (
    <div className="md:mt-0 mt-12 max-w-7xl mx-auto px-4">
      {/* Hero */}
      <section className="text-center py-12">
        <h1 className="text-4xl font-bold text-white mb-4">
          Comedy Around the World
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Explore international comedy scenes, discover global festivals, and
          learn about comedy styles from every corner of the globe.
        </p>
        <div className="flex justify-center gap-4 mt-6">
          <Link
            href="/international/touring-guide"
            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Touring Guide
          </Link>
        </div>
      </section>

      {/* Scene Grid */}
      {scenes.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">
            International Scenes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenes.map((scene) => (
              <InternationalSceneCard key={scene.id} scene={scene} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Festivals */}
      {upcomingFestivals.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">
            Upcoming Festivals
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingFestivals.map((f) => (
              <FestivalCard
                key={f.id}
                festival={{
                  ...f,
                  startDate: f.startDate?.toISOString() ?? null,
                  endDate: f.endDate?.toISOString() ?? null,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Comedy Styles */}
      {comedyStyles.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">
            Comedy Styles Around the World
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {comedyStyles.map((style) => (
              <div
                key={style.id}
                className="bg-gray-800 rounded-xl border border-gray-700 p-5"
              >
                <h3 className="text-lg font-semibold text-white mb-1">
                  {style.name}
                </h3>
                <p className="text-sm text-gray-400 mb-2">{style.country}</p>
                <p className="text-sm text-gray-300 mb-3">
                  {style.description}
                </p>
                {style.examples.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Known for: {style.examples.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Currency Converter */}
      <section className="mb-12 max-w-md">
        <h2 className="text-2xl font-bold text-white mb-6">
          Currency Converter
        </h2>
        <CurrencyConverter />
      </section>

      {/* Become a Promoter CTA */}
      <section className="mb-12 bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">
          Become a Promoter
        </h2>
        <p className="text-gray-300 mb-6 max-w-xl mx-auto">
          Are you a comedy promoter outside the US? Join the Punchline Atlas
          network and help grow the international comedy scene.
        </p>
        <Link
          href="/api/international/promoters"
          className="bg-white text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
        >
          Apply Now
        </Link>
      </section>
    </div>
  );
}
