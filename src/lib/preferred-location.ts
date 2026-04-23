export type PreferredLocation = {
  city: string;
  state: string;
};

export const PREFERRED_LOCATION_KEY = "punchline-atlas:preferred-location";

function normalizeLocationValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function sanitizePreferredLocation(input: Partial<PreferredLocation>) {
  const city = normalizeLocationValue(input.city ?? "");
  const state = normalizeLocationValue(input.state ?? "").toUpperCase();

  if (!city || !state) return null;

  return { city, state };
}

export function readPreferredLocation(): PreferredLocation | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(PREFERRED_LOCATION_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<PreferredLocation>;
    return sanitizePreferredLocation(parsed);
  } catch {
    return null;
  }
}

export function savePreferredLocation(input: PreferredLocation) {
  if (typeof window === "undefined") return;
  const sanitized = sanitizePreferredLocation(input);
  if (!sanitized) return;
  window.localStorage.setItem(PREFERRED_LOCATION_KEY, JSON.stringify(sanitized));
}

export function clearPreferredLocation() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PREFERRED_LOCATION_KEY);
}

export function formatPreferredLocation(location: PreferredLocation) {
  return `${location.city}, ${location.state}`;
}

export function buildPreferredLocationHref(
  basePath: string,
  location: PreferredLocation,
  extraParams?: Record<string, string>
) {
  const params = new URLSearchParams({
    city: location.city,
    state: location.state,
    ...extraParams,
  });

  return `${basePath}?${params.toString()}`;
}
