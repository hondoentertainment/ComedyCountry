"use client";

import Link from "next/link";

interface InternationalScene {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  region?: string | null;
  description?: string | null;
  language: string;
  currency: string;
  venueCount: number;
  comedianCount: number;
  imageUrl?: string | null;
  festivals?: { id: string }[];
}

/** ISO 3166-1 alpha-2 country code to flag emoji */
function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

export default function InternationalSceneCard({
  scene,
}: {
  scene: InternationalScene;
}) {
  const festivalCount = scene.festivals?.length ?? 0;

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-purple-500 transition-colors">
      {scene.imageUrl && (
        <div
          className="h-32 rounded-lg bg-cover bg-center mb-4"
          style={{ backgroundImage: `url(${scene.imageUrl})` }}
        />
      )}

      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl" role="img" aria-label={scene.country}>
          {countryFlag(scene.countryCode)}
        </span>
        <h3 className="text-lg font-semibold text-white">{scene.city}</h3>
      </div>

      <p className="text-sm text-gray-400 mb-3">{scene.country}</p>

      {scene.description && (
        <p className="text-sm text-gray-300 mb-4 line-clamp-2">
          {scene.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
          {scene.venueCount} venues
        </span>
        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
          {scene.comedianCount} comedians
        </span>
        {festivalCount > 0 && (
          <span className="text-xs bg-purple-900 text-purple-300 px-2 py-1 rounded-full">
            {festivalCount} festival{festivalCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
        <span title="Language">{scene.language.toUpperCase()}</span>
        <span className="text-gray-600">|</span>
        <span title="Currency">{scene.currency}</span>
        {scene.region && (
          <>
            <span className="text-gray-600">|</span>
            <span>{scene.region}</span>
          </>
        )}
      </div>

      <Link
        href={`/international?city=${encodeURIComponent(scene.city)}&country=${encodeURIComponent(scene.country)}`}
        className="text-sm text-purple-400 hover:text-purple-300 font-medium"
      >
        Explore scene &rarr;
      </Link>
    </div>
  );
}
