"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TOURING_STATUS_LABELS } from "@/lib/constants";

type ComedianData = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  headshotUrl: string | null;
  touringStatus: string;
  website: string | null;
  yearsActiveFrom: number | null;
  yearsActiveTo: number | null;
  representation: string | null;
  genres: { id: string; genre: string }[];
};

const GENRE_OPTIONS = [
  "observational", "dark", "absurdist", "political", "storyteller",
  "improv", "sketch", "physical", "clean", "roast", "one-liner",
  "surreal", "deadpan", "satirical", "musical", "alt",
];

export function AdminComedianForm({ comedian }: { comedian?: ComedianData }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    comedian?.genres.map(g => g.genre) ?? []
  );

  function toggleGenre(genre: string) {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name"),
      bio: form.get("bio"),
      headshotUrl: form.get("headshotUrl"),
      touringStatus: form.get("touringStatus"),
      website: form.get("website"),
      yearsActiveFrom: form.get("yearsActiveFrom"),
      yearsActiveTo: form.get("yearsActiveTo"),
      representation: form.get("representation"),
      genres: selectedGenres,
      instagramHandle: form.get("instagramHandle"),
    };

    try {
      const url = comedian ? `/api/admin/comedians/${comedian.id}` : "/api/admin/comedians";
      const method = comedian ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save comedian");
      }

      router.push("/admin/comedians");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1">
            Name *
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={comedian?.name}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="bio" className="block text-sm font-medium text-zinc-300 mb-1">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            defaultValue={comedian?.bio ?? ""}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 resize-y"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="headshotUrl" className="block text-sm font-medium text-zinc-300 mb-1">
            Headshot URL
          </label>
          <input
            id="headshotUrl"
            name="headshotUrl"
            type="url"
            defaultValue={comedian?.headshotUrl ?? ""}
            placeholder="https://"
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>

        <div>
          <label htmlFor="touringStatus" className="block text-sm font-medium text-zinc-300 mb-1">
            Touring Status
          </label>
          <select
            id="touringStatus"
            name="touringStatus"
            defaultValue={comedian?.touringStatus ?? "UNKNOWN"}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          >
            {Object.entries(TOURING_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="website" className="block text-sm font-medium text-zinc-300 mb-1">
            Website
          </label>
          <input
            id="website"
            name="website"
            type="url"
            defaultValue={comedian?.website ?? ""}
            placeholder="https://"
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>

        <div>
          <label htmlFor="yearsActiveFrom" className="block text-sm font-medium text-zinc-300 mb-1">
            Active From (year)
          </label>
          <input
            id="yearsActiveFrom"
            name="yearsActiveFrom"
            type="number"
            defaultValue={comedian?.yearsActiveFrom ?? ""}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>

        <div>
          <label htmlFor="yearsActiveTo" className="block text-sm font-medium text-zinc-300 mb-1">
            Active To (year)
          </label>
          <input
            id="yearsActiveTo"
            name="yearsActiveTo"
            type="number"
            defaultValue={comedian?.yearsActiveTo ?? ""}
            placeholder="Leave blank if still active"
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>

        <div>
          <label htmlFor="representation" className="block text-sm font-medium text-zinc-300 mb-1">
            Representation
          </label>
          <input
            id="representation"
            name="representation"
            defaultValue={comedian?.representation ?? ""}
            placeholder="Agency or manager"
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>

        {!comedian && (
          <div>
            <label htmlFor="instagramHandle" className="block text-sm font-medium text-zinc-300 mb-1">
              Instagram Handle
            </label>
            <input
              id="instagramHandle"
              name="instagramHandle"
              placeholder="@handle"
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-zinc-300 mb-2">Genres</p>
        <div className="flex flex-wrap gap-2">
          {GENRE_OPTIONS.map(genre => (
            <button
              key={genre}
              type="button"
              onClick={() => toggleGenre(genre)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedGenres.includes(genre)
                  ? "bg-brand-gold/20 text-brand-gold border border-brand-gold/40"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white hover:bg-zinc-700"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : comedian ? "Update Comedian" : "Create Comedian"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/comedians")}
          className="px-6 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
