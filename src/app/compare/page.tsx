"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface ComedianResult {
  id: string;
  name: string;
  slug: string;
  headshotUrl: string | null;
  bio: string | null;
  touringStatus: string;
  genres: { genre: string }[];
  _count: { followers: number; events: number };
  specialCount: number;
  avgTier: string | null;
}

export default function ComparePage() {
  const [search1, setSearch1] = useState("");
  const [search2, setSearch2] = useState("");
  const [comedian1, setComedian1] = useState<ComedianResult | null>(null);
  const [comedian2, setComedian2] = useState<ComedianResult | null>(null);
  const [results1, setResults1] = useState<Array<{ id: string; name: string; slug: string; headshotUrl: string | null }>>([]);
  const [results2, setResults2] = useState<Array<{ id: string; name: string; slug: string; headshotUrl: string | null }>>([]);

  async function searchComedians(query: string, slot: 1 | 2) {
    if (query.length < 2) {
      slot === 1 ? setResults1([]) : setResults2([]);
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=comedian&limit=5`);
      if (res.ok) {
        const data = await res.json();
        const comedians = data.comedians || [];
        slot === 1 ? setResults1(comedians) : setResults2(comedians);
      }
    } catch {
      // ignore
    }
  }

  async function selectComedian(slug: string, slot: 1 | 2) {
    slot === 1 ? setResults1([]) : setResults2([]);
    slot === 1 ? setSearch1("") : setSearch2("");
    try {
      const res = await fetch(`/api/comedians/${slug}/compare`);
      if (res.ok) {
        const data = await res.json();
        slot === 1 ? setComedian1(data) : setComedian2(data);
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold text-brand-gold mb-2">Compare Comedians</h1>
      <p className="text-zinc-400 mb-10">
        Put two comedians head-to-head. Compare genres, followers, shows, and community ratings.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Slot 1 */}
        <div>
          <div className="relative mb-4">
            <input
              type="text"
              value={search1}
              onChange={(e) => { setSearch1(e.target.value); searchComedians(e.target.value, 1); }}
              placeholder="Search first comedian..."
              className="w-full rounded-lg border border-zinc-700 bg-brand-surface px-4 py-2.5 text-white placeholder-zinc-500 focus:border-brand-gold focus:outline-none"
            />
            {results1.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-brand-surface border border-zinc-700 rounded-lg overflow-hidden z-10">
                {results1.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectComedian(c.slug, 1)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-charcoal overflow-hidden shrink-0 relative">
                      {c.headshotUrl ? (
                        <Image src={c.headshotUrl} alt={c.name} fill className="object-cover" sizes="32px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">{c.name.charAt(0)}</div>
                      )}
                    </div>
                    <span className="text-white text-sm">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {comedian1 ? <ComedianCard comedian={comedian1} /> : (
            <div className="h-64 rounded-lg border-2 border-dashed border-zinc-800 flex items-center justify-center text-zinc-600">
              Select a comedian
            </div>
          )}
        </div>

        {/* Slot 2 */}
        <div>
          <div className="relative mb-4">
            <input
              type="text"
              value={search2}
              onChange={(e) => { setSearch2(e.target.value); searchComedians(e.target.value, 2); }}
              placeholder="Search second comedian..."
              className="w-full rounded-lg border border-zinc-700 bg-brand-surface px-4 py-2.5 text-white placeholder-zinc-500 focus:border-brand-gold focus:outline-none"
            />
            {results2.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-brand-surface border border-zinc-700 rounded-lg overflow-hidden z-10">
                {results2.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectComedian(c.slug, 2)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-charcoal overflow-hidden shrink-0 relative">
                      {c.headshotUrl ? (
                        <Image src={c.headshotUrl} alt={c.name} fill className="object-cover" sizes="32px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">{c.name.charAt(0)}</div>
                      )}
                    </div>
                    <span className="text-white text-sm">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {comedian2 ? <ComedianCard comedian={comedian2} /> : (
            <div className="h-64 rounded-lg border-2 border-dashed border-zinc-800 flex items-center justify-center text-zinc-600">
              Select a comedian
            </div>
          )}
        </div>
      </div>

      {/* Comparison Table */}
      {comedian1 && comedian2 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white mb-6">Head to Head</h2>
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 bg-brand-surface">
                  <th className="px-4 py-3 text-left text-zinc-500 text-sm font-medium">Stat</th>
                  <th className="px-4 py-3 text-center text-white text-sm font-medium">{comedian1.name}</th>
                  <th className="px-4 py-3 text-center text-white text-sm font-medium">{comedian2.name}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                <CompareRow label="Followers" v1={comedian1._count.followers} v2={comedian2._count.followers} />
                <CompareRow label="Shows" v1={comedian1._count.events} v2={comedian2._count.events} />
                <CompareRow label="Specials" v1={comedian1.specialCount} v2={comedian2.specialCount} />
                <tr>
                  <td className="px-4 py-3 text-zinc-400 text-sm">Genres</td>
                  <td className="px-4 py-3 text-center text-zinc-300 text-sm">{comedian1.genres.map((g) => g.genre).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-center text-zinc-300 text-sm">{comedian2.genres.map((g) => g.genre).join(", ") || "—"}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-zinc-400 text-sm">Community Tier</td>
                  <td className="px-4 py-3 text-center text-brand-gold font-bold">{comedian1.avgTier || "—"}</td>
                  <td className="px-4 py-3 text-center text-brand-gold font-bold">{comedian2.avgTier || "—"}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-zinc-400 text-sm">Touring Status</td>
                  <td className="px-4 py-3 text-center text-zinc-300 text-sm">{comedian1.touringStatus}</td>
                  <td className="px-4 py-3 text-center text-zinc-300 text-sm">{comedian2.touringStatus}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function ComedianCard({ comedian }: { comedian: ComedianResult }) {
  return (
    <Link href={`/comedians/${comedian.slug}`} className="block p-5 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-4 mb-3">
        <div className="w-16 h-16 rounded-full bg-brand-charcoal overflow-hidden shrink-0 relative">
          {comedian.headshotUrl ? (
            <Image src={comedian.headshotUrl} alt={comedian.name} fill className="object-cover" sizes="64px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xl">{comedian.name.charAt(0)}</div>
          )}
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">{comedian.name}</h3>
          <p className="text-zinc-500 text-sm">{comedian.touringStatus}</p>
        </div>
      </div>
      {comedian.bio && <p className="text-zinc-400 text-sm line-clamp-2 mb-3">{comedian.bio}</p>}
      <div className="flex gap-4 text-xs text-zinc-500">
        <span>{comedian._count.followers} followers</span>
        <span>{comedian._count.events} shows</span>
        <span>{comedian.specialCount} specials</span>
      </div>
      {comedian.genres.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {comedian.genres.map((g) => (
            <span key={g.genre} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs">{g.genre}</span>
          ))}
        </div>
      )}
    </Link>
  );
}

function CompareRow({ label, v1, v2 }: { label: string; v1: number; v2: number }) {
  const winner = v1 > v2 ? 1 : v2 > v1 ? 2 : 0;
  return (
    <tr>
      <td className="px-4 py-3 text-zinc-400 text-sm">{label}</td>
      <td className={`px-4 py-3 text-center text-sm font-medium ${winner === 1 ? "text-brand-gold" : "text-zinc-300"}`}>
        {v1.toLocaleString()}
      </td>
      <td className={`px-4 py-3 text-center text-sm font-medium ${winner === 2 ? "text-brand-gold" : "text-zinc-300"}`}>
        {v2.toLocaleString()}
      </td>
    </tr>
  );
}
