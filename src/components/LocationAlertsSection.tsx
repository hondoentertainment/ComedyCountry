"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

type LocationAlert = {
  id: string;
  latitude: number;
  longitude: number;
  radiusMi: number;
  isActive: boolean;
  createdAt: string;
};

const RADIUS_OPTIONS = [25, 50, 75, 100, 150, 200] as const;
const NOMINATIM_MIN_INTERVAL_MS = 1100; // Nominatim ToS: max 1 req/sec

let lastGeocodeTime = 0;

/** Geocode address/city using Nominatim (required headers per ToS) */
async function geocodeAddress(query: string): Promise<{ lat: number; lng: number }> {
  const now = Date.now();
  const elapsed = now - lastGeocodeTime;
  if (elapsed < NOMINATIM_MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, NOMINATIM_MIN_INTERVAL_MS - elapsed));
  }

  const params = new URLSearchParams({
    q: query.trim(),
    format: "json",
    limit: "1",
  });

  let res: Response;
  try {
    res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Language": typeof navigator !== "undefined" ? navigator.language : "en",
          "User-Agent": "PunchlineAtlas/1.0",
        },
      }
    );
  } catch {
    throw new Error("Could not look up address. Please try 'Use my location' or a simpler search.");
  }

  lastGeocodeTime = Date.now();

  if (res.status === 429) {
    throw new Error("Too many requests. Please wait a moment and try again.");
  }
  if (!res.ok) {
    throw new Error("Could not look up address. Please try 'Use my location' or a simpler search.");
  }

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Address not found. Try a different format (e.g. city, state or full address).");
  }
  const first = data[0];
  const lat = parseFloat(first.lat);
  const lng = parseFloat(first.lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new Error("Could not look up address. Please try 'Use my location' or a simpler search.");
  }
  return { lat, lng };
}

export function LocationAlertsSection() {
  const [alerts, setAlerts] = useState<LocationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState<number>(50);
  const [addressQuery, setAddressQuery] = useState("");
  const [canAddAlert, setCanAddAlert] = useState<boolean | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/location-alerts");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLimits = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription/limits");
      if (res.ok) {
        const data = await res.json();
        setCanAddAlert(data.canAddLocationAlert ?? true);
      } else {
        setCanAddAlert(true);
      }
    } catch {
      setCanAddAlert(true);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  const saveAlert = async (latitude: number, longitude: number) => {
    const res = await fetch("/api/location-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude, longitude, radiusMi: radius }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to save");
    }
    await fetchAlerts();
    await fetchLimits();
  };

  const handleUseMyLocation = async () => {
    setError(null);
    setSaving(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });
      await saveAlert(position.coords.latitude, position.coords.longitude);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not get your location. Ensure location permissions are allowed."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = addressQuery.trim();
    if (!query) return;
    setError(null);
    setGeocoding(true);
    try {
      const { lat, lng } = await geocodeAddress(query);
      setGeocoding(false);
      setSaving(true);
      await saveAlert(lat, lng);
      setAddressQuery("");
    } catch (err) {
      setGeocoding(false);
      setError(
        err instanceof Error
          ? err.message
          : "Could not look up address. Please try 'Use my location' or a simpler search."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (alertId: string) => {
    try {
      const res = await fetch("/api/location-alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchAlerts();
      await fetchLimits();
    } catch {
      setError("Failed to remove alert");
    }
  };

  const atLimit = canAddAlert === false && alerts.length >= 1;

  if (loading) {
    return (
      <div className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800 animate-pulse">
        <div className="h-6 w-48 bg-zinc-700 rounded mb-4" />
        <div className="h-10 w-full bg-zinc-800 rounded" />
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
      <h3 className="text-lg font-semibold text-white mb-1">Location alerts</h3>
      <p className="text-zinc-400 text-sm mb-4">
        Get notified when new shows are added within your radius for comedians you follow.
      </p>

      {atLimit && (
        <p className="text-sm text-brand-gold mb-4 flex items-center gap-2">
          Free accounts can have 1 location alert.
          <Link
            href="/pricing"
            className="font-medium underline hover:no-underline"
          >
            Upgrade to Pro for unlimited
          </Link>
        </p>
      )}

      {error && (
        <p className="text-sm text-red-400 mb-4" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <label htmlFor="radius" className="block text-sm text-zinc-400 mb-1">
            Radius (miles)
          </label>
          <select
            id="radius"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          >
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r} miles
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={geocoding || saving || atLimit}
            title={atLimit ? "Upgrade to Pro for more alerts" : undefined}
            className="px-4 py-2 rounded-lg bg-brand-gold text-brand-dark font-medium hover:bg-brand-gold/90 disabled:opacity-70 transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>Saving…</>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Use my location
              </>
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleAddressSubmit} className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex-1">
          <label htmlFor="address" className="block text-sm text-zinc-400 mb-1">
            Or enter address or city
          </label>
          <input
            id="address"
            type="text"
            value={addressQuery}
            onChange={(e) => setAddressQuery(e.target.value)}
            placeholder="e.g. Austin, TX or 123 Main St"
            disabled={geocoding || saving}
            className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 disabled:opacity-70"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={geocoding || saving || !addressQuery.trim() || atLimit}
            title={atLimit ? "Upgrade to Pro for more alerts" : undefined}
            className="px-4 py-2 rounded-lg bg-zinc-700 text-white font-medium hover:bg-zinc-600 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
          >
            {geocoding ? "Looking up address…" : saving ? "Saving…" : "Add by address"}
          </button>
        </div>
      </form>

      {alerts.length > 0 ? (
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800"
            >
              <span className="text-zinc-300 text-sm">
                {alert.radiusMi} mile radius · {alert.latitude.toFixed(2)}°, {alert.longitude.toFixed(2)}°
              </span>
              <button
                type="button"
                onClick={() => handleDelete(alert.id)}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-zinc-500 text-sm">
          No alerts set. Click &quot;Use my location&quot; to get notified when new shows are added near you.
        </p>
      )}
    </div>
  );
}
