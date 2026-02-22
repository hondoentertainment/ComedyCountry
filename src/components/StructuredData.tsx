type EventStructuredDataProps = {
  event: {
    id: string;
    title: string | null;
    date: Date;
    showtime: string | null;
    ticketUrl: string | null;
    venue: { name: string; address: string | null; city: string; state: string };
    comedians: Array<{ comedian: { name: string } }>;
  };
  baseUrl: string;
};

export function EventStructuredData({ event, baseUrl }: EventStructuredDataProps) {
  const name = event.title ?? event.comedians.map((ec) => ec.comedian.name).join(", ");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    startDate: new Date(event.date).toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venue.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: event.venue.address ?? undefined,
        addressLocality: event.venue.city,
        addressRegion: event.venue.state,
      },
    },
    url: `${baseUrl}/events/${event.id}`,
    ...(event.ticketUrl && { offers: { "@type": "Offer", url: event.ticketUrl } }),
    ...(event.showtime && { doorTime: event.showtime }),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

type VenueStructuredDataProps = {
  venue: {
    id: string;
    name: string;
    address: string | null;
    city: string;
    state: string;
    website: string | null;
    capacity: number | null;
  };
  baseUrl: string;
};

export function VenueStructuredData({ venue, baseUrl }: VenueStructuredDataProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: venue.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: venue.address ?? undefined,
      addressLocality: venue.city,
      addressRegion: venue.state,
    },
    url: `${baseUrl}/venues/${venue.id}`,
    ...(venue.website && { sameAs: venue.website }),
    ...(venue.capacity && { maximumAttendeeCapacity: venue.capacity }),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
