import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Community Clips | Punchline Atlas",
  description: "Watch and share comedy clips from the community.",
};

export const dynamic = "force-dynamic";

export default async function ClipsPage({
  searchParams,
}: {
  searchParams: Promise<{ comedianId?: string; venueId?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const limit = 12;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { status: "APPROVED" };
  if (sp.comedianId) where.comedianId = sp.comedianId;
  if (sp.venueId) where.venueId = sp.venueId;

  let clips: Array<{
    id: string;
    videoUrl: string;
    thumbnailUrl: string | null;
    caption: string | null;
    upvotes: number;
    downvotes: number;
    durationSec: number | null;
    createdAt: Date;
  }> = [];
  let total = 0;

  try {
    const [c, t] = await Promise.all([
      prisma.userClip.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.userClip.count({ where }),
    ]);
    clips = c;
    total = t;
  } catch {
    // DB not configured
  }

  const pages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-gold">
            Community Clips
          </h1>
          <p className="text-zinc-400 mt-1">
            Short comedy clips shared by the community.
          </p>
        </div>
      </div>

      {clips.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clips.map((clip) => (
            <div
              key={clip.id}
              className="bg-brand-surface border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-700 transition-colors"
            >
              <div className="aspect-video bg-zinc-900 flex items-center justify-center">
                <video
                  src={clip.videoUrl}
                  poster={clip.thumbnailUrl ?? undefined}
                  className="w-full h-full object-cover"
                  preload="metadata"
                  controls
                />
              </div>
              <div className="p-3">
                {clip.caption && (
                  <p className="text-zinc-300 text-sm line-clamp-2 mb-2">
                    {clip.caption}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex items-center gap-3">
                    <span className="text-green-500">
                      +{clip.upvotes}
                    </span>
                    <span className="text-red-500">
                      -{clip.downvotes}
                    </span>
                  </div>
                  {clip.durationSec && (
                    <span>
                      {Math.floor(clip.durationSec / 60)}:
                      {String(clip.durationSec % 60).padStart(2, "0")}
                    </span>
                  )}
                  <span>
                    {new Date(clip.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-zinc-500">
          No clips yet. Be the first to share one!
        </p>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {page > 1 && (
            <Link
              href={`/clips?page=${page - 1}${sp.comedianId ? `&comedianId=${sp.comedianId}` : ""}${sp.venueId ? `&venueId=${sp.venueId}` : ""}`}
              className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-400 text-sm hover:text-white"
            >
              Previous
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm text-zinc-500">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link
              href={`/clips?page=${page + 1}${sp.comedianId ? `&comedianId=${sp.comedianId}` : ""}${sp.venueId ? `&venueId=${sp.venueId}` : ""}`}
              className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-400 text-sm hover:text-white"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
