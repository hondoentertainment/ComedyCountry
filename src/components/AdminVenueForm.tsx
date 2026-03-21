"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VENUE_TYPE_LABELS } from "@/lib/constants";

type VenueData = {
  id: string;
  name: string;
  address: string | null;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  website: string | null;
  type: string;
};

export function AdminVenueForm({ venue }: { venue?: VenueData }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(form: HTMLFormElement): boolean {
    const errors: Record<string, string> = {};
    const data = new FormData(form);
    if (!data.get("name")?.toString().trim()) errors.name = "Name is required";
    if (!data.get("city")?.toString().trim()) errors.city = "City is required";
    if (!data.get("state")?.toString().trim()) errors.state = "State is required";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstKey = Object.keys(errors)[0];
      form.querySelector<HTMLInputElement>(`[name="${firstKey}"]`)?.focus();
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate(e.currentTarget)) return;
    setSaving(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name"),
      address: form.get("address"),
      city: form.get("city"),
      state: form.get("state"),
      latitude: form.get("latitude"),
      longitude: form.get("longitude"),
      capacity: form.get("capacity"),
      website: form.get("website"),
      type: form.get("type"),
    };

    try {
      const url = venue ? `/api/admin/venues/${venue.id}` : "/api/admin/venues";
      const method = venue ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save venue");
      }

      router.push("/admin/venues");
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
            defaultValue={venue?.name}
            aria-invalid={!!fieldErrors.name}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
            onChange={() => setFieldErrors(prev => ({ ...prev, name: "" }))}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
          {fieldErrors.name && <p id="name-error" className="text-red-400 text-xs mt-1" role="alert">{fieldErrors.name}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="address" className="block text-sm font-medium text-zinc-300 mb-1">
            Address
          </label>
          <input
            id="address"
            name="address"
            defaultValue={venue?.address ?? ""}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-zinc-300 mb-1">
            City *
          </label>
          <input
            id="city"
            name="city"
            required
            defaultValue={venue?.city}
            aria-invalid={!!fieldErrors.city}
            aria-describedby={fieldErrors.city ? "city-error" : undefined}
            onChange={() => setFieldErrors(prev => ({ ...prev, city: "" }))}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
          {fieldErrors.city && <p id="city-error" className="text-red-400 text-xs mt-1" role="alert">{fieldErrors.city}</p>}
        </div>

        <div>
          <label htmlFor="state" className="block text-sm font-medium text-zinc-300 mb-1">
            State *
          </label>
          <input
            id="state"
            name="state"
            required
            defaultValue={venue?.state}
            placeholder="e.g., CA"
            aria-invalid={!!fieldErrors.state}
            aria-describedby={fieldErrors.state ? "state-error" : undefined}
            onChange={() => setFieldErrors(prev => ({ ...prev, state: "" }))}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
          {fieldErrors.state && <p id="state-error" className="text-red-400 text-xs mt-1" role="alert">{fieldErrors.state}</p>}
        </div>

        <div>
          <label htmlFor="latitude" className="block text-sm font-medium text-zinc-300 mb-1">
            Latitude
          </label>
          <input
            id="latitude"
            name="latitude"
            type="number"
            step="any"
            defaultValue={venue?.latitude ?? ""}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>

        <div>
          <label htmlFor="longitude" className="block text-sm font-medium text-zinc-300 mb-1">
            Longitude
          </label>
          <input
            id="longitude"
            name="longitude"
            type="number"
            step="any"
            defaultValue={venue?.longitude ?? ""}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-zinc-300 mb-1">
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={venue?.type ?? "CLUB"}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          >
            {Object.entries(VENUE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="capacity" className="block text-sm font-medium text-zinc-300 mb-1">
            Capacity
          </label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            defaultValue={venue?.capacity ?? ""}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="website" className="block text-sm font-medium text-zinc-300 mb-1">
            Website
          </label>
          <input
            id="website"
            name="website"
            type="url"
            defaultValue={venue?.website ?? ""}
            placeholder="https://"
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : venue ? "Update Venue" : "Create Venue"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/venues")}
          className="px-6 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
