"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PressKit {
  comedian: {
    id: string;
    name: string;
    slug: string;
    headshotUrl: string | null;
    bio: string | null;
    yearsActiveFrom: number | null;
    yearsActiveTo: number | null;
    representation: string | null;
    touringStatus: string;
    website: string | null;
  };
  genres: { id: string; genre: string }[];
  socialLinks: { id: string; platform: string; url: string }[];
  specials: { id: string; title: string; releaseDate: string | null }[];
  recentShows: { id: string; title: string; date: string }[];
  clips: { id: string; title: string; mediaUrl: string | null; mediaType: string | null; publishedAt: string }[];
  stats: {
    followers: number;
    totalShows: number;
    tips: number;
    avgRating: number | null;
    ratingCount: number;
  };
}

export default function CreatorPressKitPage() {
  const [kit, setKit] = useState<PressKit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Get comedian ID from claim
        const claimRes = await fetch("/api/comedian-claim");
        if (!claimRes.ok) { setLoading(false); return; }
        const claims = await claimRes.json();
        const approved = Array.isArray(claims)
          ? claims.find((c: { status: string }) => c.status === "APPROVED")
          : claims.status === "APPROVED" ? claims : null;
        if (!approved) { setLoading(false); return; }

        const res = await fetch(`/api/creator/press-kit/${approved.comedianId}`);
        if (res.ok) setKit(await res.json());
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!kit) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-zinc-400">Unable to load press kit. Make sure you have an approved comedian profile.</p>
      </div>
    );
  }

  const { comedian, genres, socialLinks, specials, recentShows, clips, stats } = kit;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/creator" className="text-sm text-zinc-500 hover:text-zinc-300 mb-1 block">
        &larr; Creator Hub
      </Link>
      <h1 className="text-2xl font-bold text-brand-gold mb-1">Electronic Press Kit</h1>
      <p className="text-zinc-500 text-sm mb-8">Auto-generated from your profile data. Share this page with venues and bookers.</p>

      {/* Header */}
      <div className="p-6 rounded-lg bg-brand-surface border border-zinc-800 mb-6 flex flex-col sm:flex-row items-center gap-6">
        {comedian.headshotUrl ? (
          <img src={comedian.headshotUrl} alt={comedian.name} className="w-28 h-28 rounded-full object-cover border-2 border-brand-gold/30" />
        ) : (
          <div className="w-28 h-28 rounded-full bg-zinc-800 flex items-center justify-center text-3xl text-zinc-600">
            ?
          </div>
        )}
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold text-white">{comedian.name}</h2>
          {genres.length > 0 && (
            <p className="text-zinc-400 text-sm mt-1">
              {genres.map((g) => g.genre).join(", ")}
            </p>
          )}
          {comedian.touringStatus && comedian.touringStatus !== "UNKNOWN" && (
            <span className="inline-block mt-2 text-xs px-2 py-1 rounded bg-brand-gold/20 text-brand-gold">
              {comedian.touringStatus.replace(/_/g, " ")}
            </span>
          )}
        </div>
      </div>

      {/* Bio */}
      {comedian.bio && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Bio</h3>
          <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{comedian.bio}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <MiniStat label="Followers" value={String(stats.followers)} />
        <MiniStat label="Shows" value={String(stats.totalShows)} />
        <MiniStat label="Avg Rating" value={stats.avgRating ? stats.avgRating.toFixed(1) : "N/A"} />
        <MiniStat label="Ratings" value={String(stats.ratingCount)} />
      </div>

      {/* Specials */}
      {specials.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Specials</h3>
          <div className="space-y-2">
            {specials.map((s) => (
              <div key={s.id} className="p-3 rounded-lg bg-brand-surface border border-zinc-800 flex justify-between items-center">
                <span className="text-white">{s.title}</span>
                {s.releaseDate && <span className="text-zinc-500 text-xs">{new Date(s.releaseDate).getFullYear()}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Shows */}
      {recentShows.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Recent Shows</h3>
          <div className="space-y-2">
            {recentShows.map((show) => (
              <div key={show.id} className="p-3 rounded-lg bg-brand-surface border border-zinc-800 flex justify-between items-center">
                <span className="text-white text-sm">{show.title}</span>
                <span className="text-zinc-500 text-xs">{new Date(show.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clips */}
      {clips.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Clips</h3>
          <div className="space-y-2">
            {clips.map((clip) => (
              <div key={clip.id} className="p-3 rounded-lg bg-brand-surface border border-zinc-800">
                <span className="text-white text-sm">{clip.title}</span>
                {clip.mediaUrl && (
                  <a href={clip.mediaUrl} target="_blank" rel="noopener noreferrer"
                    className="ml-2 text-brand-gold text-xs hover:underline">
                    Watch &rarr;
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Social Links */}
      {socialLinks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Social Links</h3>
          <div className="flex flex-wrap gap-2">
            {socialLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-brand-surface border border-zinc-700 text-zinc-300 text-sm hover:border-brand-gold/50 hover:text-brand-gold transition-colors"
              >
                {link.platform}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
      <div className="p-6 rounded-lg bg-brand-surface border border-zinc-800">
        <h3 className="text-lg font-semibold text-white mb-2">Booking & Contact</h3>
        {comedian.representation && (
          <p className="text-zinc-400 text-sm">Representation: {comedian.representation}</p>
        )}
        {comedian.website && (
          <p className="text-zinc-400 text-sm mt-1">
            Website:{" "}
            <a href={comedian.website} target="_blank" rel="noopener noreferrer" className="text-brand-gold hover:underline">
              {comedian.website}
            </a>
          </p>
        )}
        {comedian.yearsActiveFrom && (
          <p className="text-zinc-500 text-xs mt-2">
            Active since {comedian.yearsActiveFrom}
            {comedian.yearsActiveTo ? ` - ${comedian.yearsActiveTo}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-brand-surface border border-zinc-800 text-center">
      <p className="text-zinc-500 text-xs">{label}</p>
      <p className="text-white font-bold text-lg">{value}</p>
    </div>
  );
}
