/**
 * Geolocation and distance calculation utilities.
 *
 * Provides haversine distance, bounding-box filtering, and geo-related helpers
 * for location-based show discovery and alerts.
 */

/** Earth's radius in miles */
const EARTH_RADIUS_MI = 3958.8;
/** Earth's radius in kilometers */
const EARTH_RADIUS_KM = 6371.0;

/** Degrees to radians */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Radians to degrees */
function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/**
 * Calculate the great-circle distance between two points using the Haversine formula.
 * Returns distance in miles.
 */
export function haversineDistanceMi(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MI * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate the great-circle distance between two points using the Haversine formula.
 * Returns distance in kilometers.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compute a bounding box around a center point for a given radius in miles.
 * Useful for quick SQL/Prisma pre-filtering before applying exact haversine.
 */
export function boundingBoxMi(
  centerLat: number,
  centerLon: number,
  radiusMi: number
): BoundingBox {
  const latDelta = toDeg(radiusMi / EARTH_RADIUS_MI);
  // Longitude degrees vary with latitude
  const lonDelta = toDeg(
    radiusMi / (EARTH_RADIUS_MI * Math.cos(toRad(centerLat)))
  );

  return {
    minLat: centerLat - latDelta,
    maxLat: centerLat + latDelta,
    minLon: centerLon - lonDelta,
    maxLon: centerLon + lonDelta,
  };
}

/**
 * Check if a coordinate is within a bounding box.
 */
export function isInBoundingBox(
  lat: number,
  lon: number,
  box: BoundingBox
): boolean {
  return (
    lat >= box.minLat &&
    lat <= box.maxLat &&
    lon >= box.minLon &&
    lon <= box.maxLon
  );
}

/**
 * Filter an array of items with lat/lon by distance from a center point.
 * Returns items within radiusMi, sorted by distance ascending.
 */
export function filterByDistance<T extends { latitude: number | null; longitude: number | null }>(
  items: T[],
  centerLat: number,
  centerLon: number,
  radiusMi: number
): (T & { distanceMi: number })[] {
  // First pass: bounding box filter for performance
  const box = boundingBoxMi(centerLat, centerLon, radiusMi);

  return items
    .filter(
      (item) =>
        item.latitude != null &&
        item.longitude != null &&
        isInBoundingBox(item.latitude, item.longitude, box)
    )
    .map((item) => ({
      ...item,
      distanceMi: haversineDistanceMi(
        centerLat,
        centerLon,
        item.latitude!,
        item.longitude!
      ),
    }))
    .filter((item) => item.distanceMi <= radiusMi)
    .sort((a, b) => a.distanceMi - b.distanceMi);
}

/**
 * Format a distance in miles for display.
 * Shows "X.Y mi" for distances >= 0.1, "<0.1 mi" for very close.
 */
export function formatDistanceMi(distanceMi: number): string {
  if (distanceMi < 0.1) return "<0.1 mi";
  if (distanceMi < 10) return `${distanceMi.toFixed(1)} mi`;
  return `${Math.round(distanceMi)} mi`;
}

/**
 * Validate latitude and longitude values.
 */
export function isValidCoordinates(lat: number, lon: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Parse a "lat,lon" string into Coordinates.
 * Returns null if invalid.
 */
export function parseCoordinateString(
  str: string
): Coordinates | null {
  const parts = str.split(",").map((s) => parseFloat(s.trim()));
  if (parts.length !== 2) return null;
  const [latitude, longitude] = parts;
  if (!isValidCoordinates(latitude, longitude)) return null;
  return { latitude, longitude };
}
