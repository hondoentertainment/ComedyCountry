"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { logger } from "@/lib/logger";

type SimilarComedian = {
  id: string;
  name: string;
  slug: string;
  headshotUrl: string | null;
  genres: { genre: string }[];
  _count: { followers: number };
};

export function SimilarComedians({ comedianId }: { comedianId: string }) {
  const [comedians, setComedians] = useState<SimilarComedian[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/comedians/${comedianId}/similar`)
      .then((r) => r.json())
      .then((data) => setComedians(data.similar ?? []))
      .catch((err) => {
        logger.error(
          "SimilarComedians fetch failed",
          {},
          err instanceof Error ? err : undefined,
        );
      })
      .finally(() => setLoading(false));
  }, [comedianId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg bg-zinc-800 animate-pulse h-48" />
        ))}
      </div>
    );
  }

  if (comedians.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">
        Similar comedians
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {comedians.map((c) => (
          <Link
            key={c.id}
            href={`/comedians/${c.slug}`}
            className="group rounded-lg bg-brand-surface border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors"
          >
            <div className="aspect-square bg-brand-charcoal relative overflow-hidden">
              {c.headshotUrl ? (
                <Image
                  src={c.headshotUrl}
                  alt={c.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-zinc-600">
                  {c.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-white text-sm font-medium truncate">
                {c.name}
              </p>
              <p className="text-zinc-500 text-xs mt-0.5">
                {c._count.followers} follower
                {c._count.followers !== 1 ? "s" : ""}
              </p>
              {c.genres.length > 0 && (
                <p className="text-zinc-600 text-xs mt-1 truncate">
                  {c.genres.map((g) => g.genre).join(", ")}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
