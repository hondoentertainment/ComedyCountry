"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  GoogleMap,
  useLoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { useCookieConsent } from "@/components/CookieConsent";

type VenueWithCoords = {
  id: string;
  name: string;
  address: string | null;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
};

type VenueMapProps = {
  venues: VenueWithCoords[];
};

const mapContainerStyle = {
  width: "100%",
  height: "min(500px, 70vh)",
  minHeight: "320px",
};

const defaultCenter = { lat: 39.8283, lng: -98.5795 }; // USA center

/** Placeholder shown when user has not consented to non-essential cookies (Google Maps). */
function MapConsentPlaceholder({ venueCount }: { venueCount: number }) {
  const { openPreferences } = useCookieConsent();
  return (
    <div className="aspect-video rounded-lg bg-zinc-800 border border-zinc-700 flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
      <p className="mb-2">The map uses Google Maps, which may set cookies.</p>
      <p className="text-sm mb-4">
        Accept cookies in the banner below or via{" "}
        <button
          type="button"
          onClick={openPreferences}
          className="text-brand-gold hover:underline font-medium"
        >
          Cookie preferences
        </button>{" "}
        in the footer to view the map.
      </p>
      <p className="text-sm text-zinc-500">
        {venueCount} venue{venueCount !== 1 ? "s" : ""} with coordinates available.
      </p>
      <Link
        href="/privacy"
        className="text-sm text-brand-gold hover:underline mt-2"
      >
        Privacy Policy
      </Link>
    </div>
  );
}

function VenueMapInner({ venues }: VenueMapProps) {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey ?? "",
    preventGoogleFontsLoading: true,
  });

  const validVenues = useMemo(
    () =>
      venues.filter(
        (v) => v.latitude != null && v.longitude != null
      ) as (VenueWithCoords & { latitude: number; longitude: number })[],
    [venues]
  );

  const center = useMemo(() => {
    if (validVenues.length === 0) return defaultCenter;
    const avgLat =
      validVenues.reduce((sum, v) => sum + v.latitude, 0) / validVenues.length;
    const avgLng =
      validVenues.reduce((sum, v) => sum + v.longitude, 0) /
      validVenues.length;
    return { lat: avgLat, lng: avgLng };
  }, [validVenues]);

  const bounds = useMemo(() => {
    if (validVenues.length <= 1) return undefined;
    const lats = validVenues.map((v) => v.latitude);
    const lngs = validVenues.map((v) => v.longitude);
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    };
  }, [validVenues]);

  if (!apiKey) {
    return (
      <div className="aspect-video rounded-lg bg-zinc-800 border border-zinc-700 flex flex-col items-center justify-center text-zinc-500 p-8 text-center">
        <p className="mb-2">Google Maps requires an API key.</p>
        <p className="text-sm">
          Add{" "}
          <code className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </code>{" "}
          to your .env file.
        </p>
        <p className="text-sm mt-4 text-zinc-400">
          {validVenues.length} venue{validVenues.length !== 1 ? "s" : ""} with
          coordinates ready to display.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="aspect-video rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-red-400 p-4">
        Failed to load Google Maps. Check your API key and billing.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="aspect-video rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500">
        Loading map…
      </div>
    );
  }

  const selectedVenue = validVenues.find((v) => v.id === selectedVenueId);

  return (
    <div className="rounded-lg overflow-hidden border border-zinc-700">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={validVenues.length === 0 ? 4 : bounds ? undefined : 10}
        onClick={() => setSelectedVenueId(null)}
        options={{
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: true,
          scaleControl: true,
          streetViewControl: false,
          rotateControl: true,
          fullscreenControl: true,
        }}
        {...(bounds && {
          onLoad: (map) => {
            map.fitBounds(
              new window.google.maps.LatLngBounds(
                { lat: bounds.south, lng: bounds.west },
                { lat: bounds.north, lng: bounds.east }
              ),
              { top: 40, right: 40, bottom: 40, left: 40 }
            );
          },
        })}
      >
        {validVenues.map((venue) => (
          <Marker
            key={venue.id}
            position={{
              lat: venue.latitude,
              lng: venue.longitude,
            }}
            title={venue.name}
            onClick={() =>
              setSelectedVenueId(selectedVenueId === venue.id ? null : venue.id)
            }
          >
            {selectedVenue?.id === venue.id && (
              <InfoWindow onCloseClick={() => setSelectedVenueId(null)}>
                <div className="p-2 min-w-[200px]">
                  <Link
                    href={`/venues/${venue.id}`}
                    className="font-medium text-brand-gold hover:underline"
                  >
                    {venue.name}
                  </Link>
                  <p className="text-sm text-zinc-600 mt-0.5">
                    {venue.address && `${venue.address}, `}
                    {venue.city}, {venue.state}
                  </p>
                  <Link
                    href={`/venues/${venue.id}`}
                    className="text-sm text-brand-gold hover:underline mt-1 inline-block"
                  >
                    View venue →
                  </Link>
                </div>
              </InfoWindow>
            )}
          </Marker>
        ))}
      </GoogleMap>
    </div>
  );
}

export function VenueMap({ venues }: VenueMapProps) {
  const { hasConsented } = useCookieConsent();
  const validVenues = useMemo(
    () =>
      venues.filter(
        (v) => v.latitude != null && v.longitude != null
      ) as (VenueWithCoords & { latitude: number; longitude: number })[],
    [venues]
  );

  if (!hasConsented) {
    return <MapConsentPlaceholder venueCount={validVenues.length} />;
  }

  return <VenueMapInner venues={venues} />;
}
