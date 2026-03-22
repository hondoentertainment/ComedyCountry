/**
 * Generic reusable component for rendering JSON-LD structured data.
 * Accepts any schema.org-compatible data object.
 */
export function StructuredData({ data }: { data: Record<string, any> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ---------------------------------------------------------------------------
// Event
// ---------------------------------------------------------------------------

type EventStructuredDataProps = {
  event: {
    id: string;
    title: string | null;
    date: Date;
    endDate?: Date | null;
    showtime: string | null;
    ticketUrl: string | null;
    venue: { name: string; address: string | null; city: string; state: string };
    comedians: Array<{
      comedian: {
        name: string;
        slug?: string | null;
        headshotUrl?: string | null;
      };
    }>;
  };
  baseUrl: string;
};

export function EventStructuredData({ event, baseUrl }: EventStructuredDataProps) {
  const name = event.title ?? event.comedians.map((ec) => ec.comedian.name).join(", ");
  const performers = event.comedians.map((ec) => ({
    "@type": "Person" as const,
    name: ec.comedian.name,
    jobTitle: "Comedian" as const,
    ...(ec.comedian.slug && { url: `${baseUrl}/comedians/${ec.comedian.slug}` }),
    ...(ec.comedian.headshotUrl && { image: ec.comedian.headshotUrl }),
  }));
  const image =
    event.comedians[0]?.comedian?.headshotUrl ?? undefined;
  const description = `${name} at ${event.venue.name} in ${event.venue.city}, ${event.venue.state}.`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    description,
    startDate: new Date(event.date).toISOString(),
    ...(event.endDate && { endDate: new Date(event.endDate).toISOString() }),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place" as const,
      name: event.venue.name,
      address: {
        "@type": "PostalAddress" as const,
        streetAddress: event.venue.address ?? undefined,
        addressLocality: event.venue.city,
        addressRegion: event.venue.state,
      },
    },
    url: `${baseUrl}/events/${event.id}`,
    ...(performers.length > 0 && { performer: performers.length === 1 ? performers[0] : performers }),
    ...(image && { image }),
    ...(event.ticketUrl && { offers: { "@type": "Offer" as const, url: event.ticketUrl } }),
    ...(event.showtime && { doorTime: event.showtime }),
  };
  return <StructuredData data={jsonLd} />;
}

// ---------------------------------------------------------------------------
// Comedian
// ---------------------------------------------------------------------------

type ComedianStructuredDataProps = {
  comedian: {
    id: string;
    name: string;
    slug: string;
    bio: string | null;
    headshotUrl: string | null;
    website: string | null;
    socialLinks: Array<{ platform: string; url: string }>;
  };
  baseUrl: string;
};

export function ComedianStructuredData({
  comedian,
  baseUrl,
}: ComedianStructuredDataProps) {
  const url = `${baseUrl}/comedians/${comedian.slug}`;
  const sameAs = [
    ...(comedian.website ? [comedian.website] : []),
    ...comedian.socialLinks.map((l) => l.url),
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: comedian.name,
    jobTitle: "Comedian",
    url,
    description: comedian.bio ?? `Comedian profile and upcoming shows for ${comedian.name}.`,
    ...(comedian.headshotUrl && { image: comedian.headshotUrl }),
    ...(sameAs.length > 0 && { sameAs }),
  };
  return <StructuredData data={jsonLd} />;
}

// ---------------------------------------------------------------------------
// Venue
// ---------------------------------------------------------------------------

type VenueStructuredDataProps = {
  venue: {
    id: string;
    name: string;
    address: string | null;
    city: string;
    state: string;
    website: string | null;
    capacity: number | null;
    latitude?: number | null;
    longitude?: number | null;
    description?: string | null;
    phone?: string | null;
    photos?: Array<{ url: string }>;
  };
  baseUrl: string;
};

export function VenueStructuredData({ venue, baseUrl }: VenueStructuredDataProps) {
  const description =
    venue.description ??
    `Comedy venue ${venue.name} in ${venue.city}, ${venue.state}.`;
  const imageUrl = venue.photos?.[0]?.url ?? undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: venue.name,
    description,
    address: {
      "@type": "PostalAddress",
      streetAddress: venue.address ?? undefined,
      addressLocality: venue.city,
      addressRegion: venue.state,
    },
    url: `${baseUrl}/venues/${venue.id}`,
    ...(venue.latitude != null &&
      venue.longitude != null && {
        geo: {
          "@type": "GeoCoordinates",
          latitude: venue.latitude,
          longitude: venue.longitude,
        },
      }),
    ...(imageUrl && { image: imageUrl }),
    ...(venue.phone && { telephone: venue.phone }),
    ...(venue.website && { sameAs: venue.website }),
    ...(venue.capacity && { maximumAttendeeCapacity: venue.capacity }),
  };
  return <StructuredData data={jsonLd} />;
}
