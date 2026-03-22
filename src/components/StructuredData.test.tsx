import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  StructuredData,
  EventStructuredData,
  VenueStructuredData,
  ComedianStructuredData,
} from "./StructuredData";

// ---------------------------------------------------------------------------
// Generic StructuredData
// ---------------------------------------------------------------------------

describe("StructuredData", () => {
  it("renders a JSON-LD script tag with the supplied data", () => {
    const data = { "@context": "https://schema.org", "@type": "Thing", name: "Test" };
    const { container } = render(<StructuredData data={data} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();
    const json = JSON.parse(script!.textContent!);
    expect(json).toEqual(data);
  });
});

// ---------------------------------------------------------------------------
// EventStructuredData
// ---------------------------------------------------------------------------

describe("EventStructuredData", () => {
  it("renders JSON-LD script with event data", () => {
    const event = {
      id: "evt-1",
      title: "Stand Up Night",
      date: new Date("2025-03-15T20:00:00Z"),
      showtime: "8:00 PM",
      ticketUrl: "https://tickets.example.com/evt-1",
      venue: {
        name: "Comedy Cellar",
        address: "117 MacDougal St",
        city: "New York",
        state: "NY",
      },
      comedians: [{ comedian: { name: "Jane Doe" } }],
    };

    const { container } = render(
      <EventStructuredData event={event} baseUrl="https://example.com" />
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();
    const json = JSON.parse(script!.textContent!);
    expect(json["@type"]).toBe("Event");
    expect(json.name).toBe("Stand Up Night");
    expect(json.url).toBe("https://example.com/events/evt-1");
    expect(json.location.name).toBe("Comedy Cellar");
  });

  it("uses comedian names when title is null", () => {
    const event = {
      id: "evt-2",
      title: null,
      date: new Date("2025-06-01T20:00:00Z"),
      showtime: null,
      ticketUrl: null,
      venue: {
        name: "Comedy Club",
        address: null,
        city: "Nashville",
        state: "TN",
      },
      comedians: [
        { comedian: { name: "Dave" } },
        { comedian: { name: "Amy" } },
      ],
    };

    const { container } = render(
      <EventStructuredData event={event} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json.name).toBe("Dave, Amy");
  });

  it("includes ticket offer when ticketUrl present", () => {
    const event = {
      id: "evt-3",
      title: "Show",
      date: new Date(),
      showtime: null,
      ticketUrl: "https://tickets.com",
      venue: { name: "Club", address: null, city: "NYC", state: "NY" },
      comedians: [],
    };

    const { container } = render(
      <EventStructuredData event={event} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json.offers).toEqual({ "@type": "Offer", url: "https://tickets.com" });
  });

  it("omits offers when no ticketUrl", () => {
    const event = {
      id: "evt-4",
      title: "Show",
      date: new Date(),
      showtime: null,
      ticketUrl: null,
      venue: { name: "Club", address: null, city: "NYC", state: "NY" },
      comedians: [],
    };

    const { container } = render(
      <EventStructuredData event={event} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json).not.toHaveProperty("offers");
  });

  it("includes doorTime when showtime is present", () => {
    const event = {
      id: "evt-5",
      title: "Show",
      date: new Date(),
      showtime: "7:30 PM",
      ticketUrl: null,
      venue: { name: "Club", address: null, city: "NYC", state: "NY" },
      comedians: [],
    };

    const { container } = render(
      <EventStructuredData event={event} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json.doorTime).toBe("7:30 PM");
  });

  it("includes performer with slug URL and headshot", () => {
    const event = {
      id: "evt-6",
      title: "Show",
      date: new Date(),
      showtime: null,
      ticketUrl: null,
      venue: { name: "Club", address: null, city: "NYC", state: "NY" },
      comedians: [
        {
          comedian: {
            name: "Jane",
            slug: "jane",
            headshotUrl: "https://example.com/jane.jpg",
          },
        },
      ],
    };

    const { container } = render(
      <EventStructuredData event={event} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json.performer).toEqual({
      "@type": "Person",
      name: "Jane",
      jobTitle: "Comedian",
      url: "https://example.com/comedians/jane",
      image: "https://example.com/jane.jpg",
    });
  });

  it("uses array of performers when multiple comedians", () => {
    const event = {
      id: "evt-7",
      title: "Show",
      date: new Date(),
      showtime: null,
      ticketUrl: null,
      venue: { name: "Club", address: null, city: "NYC", state: "NY" },
      comedians: [
        { comedian: { name: "A" } },
        { comedian: { name: "B" } },
      ],
    };

    const { container } = render(
      <EventStructuredData event={event} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(Array.isArray(json.performer)).toBe(true);
    expect(json.performer).toHaveLength(2);
  });

  it("includes description derived from name and venue", () => {
    const event = {
      id: "evt-8",
      title: "Big Laughs",
      date: new Date(),
      showtime: null,
      ticketUrl: null,
      venue: { name: "Club", address: null, city: "NYC", state: "NY" },
      comedians: [],
    };

    const { container } = render(
      <EventStructuredData event={event} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json.description).toBe("Big Laughs at Club in NYC, NY.");
  });

  it("includes endDate when provided", () => {
    const event = {
      id: "evt-9",
      title: "Weekend Show",
      date: new Date("2025-06-01T19:00:00Z"),
      endDate: new Date("2025-06-01T21:00:00Z"),
      showtime: null,
      ticketUrl: null,
      venue: { name: "Club", address: null, city: "NYC", state: "NY" },
      comedians: [],
    };

    const { container } = render(
      <EventStructuredData event={event} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json.endDate).toBe("2025-06-01T21:00:00.000Z");
  });

  it("omits endDate when not provided", () => {
    const event = {
      id: "evt-10",
      title: "Show",
      date: new Date(),
      showtime: null,
      ticketUrl: null,
      venue: { name: "Club", address: null, city: "NYC", state: "NY" },
      comedians: [],
    };

    const { container } = render(
      <EventStructuredData event={event} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json).not.toHaveProperty("endDate");
  });
});

// ---------------------------------------------------------------------------
// VenueStructuredData
// ---------------------------------------------------------------------------

describe("VenueStructuredData", () => {
  it("renders JSON-LD script with venue data", () => {
    const venue = {
      id: "venue-1",
      name: "Laugh Factory",
      address: "8001 Sunset Blvd",
      city: "Los Angeles",
      state: "CA",
      website: "https://laughfactory.com",
      capacity: 300,
    };

    const { container } = render(
      <VenueStructuredData venue={venue} baseUrl="https://example.com" />
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();
    const json = JSON.parse(script!.textContent!);
    expect(json["@type"]).toBe("Place");
    expect(json.name).toBe("Laugh Factory");
    expect(json.url).toBe("https://example.com/venues/venue-1");
    expect(json.maximumAttendeeCapacity).toBe(300);
  });

  it("omits capacity when null", () => {
    const venue = {
      id: "venue-2",
      name: "Open Mic Bar",
      address: null,
      city: "Austin",
      state: "TX",
      website: null,
      capacity: null,
    };

    const { container } = render(
      <VenueStructuredData venue={venue} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json).not.toHaveProperty("maximumAttendeeCapacity");
  });

  it("includes website as sameAs when present", () => {
    const venue = {
      id: "venue-3",
      name: "Club",
      address: null,
      city: "NYC",
      state: "NY",
      website: "https://club.com",
      capacity: null,
    };

    const { container } = render(
      <VenueStructuredData venue={venue} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json.sameAs).toBe("https://club.com");
  });

  it("omits sameAs when no website", () => {
    const venue = {
      id: "venue-4",
      name: "Club",
      address: null,
      city: "NYC",
      state: "NY",
      website: null,
      capacity: null,
    };

    const { container } = render(
      <VenueStructuredData venue={venue} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json).not.toHaveProperty("sameAs");
  });

  it("includes PostalAddress in location", () => {
    const venue = {
      id: "venue-5",
      name: "Comedy Club",
      address: "123 Main St",
      city: "Nashville",
      state: "TN",
      website: null,
      capacity: null,
    };

    const { container } = render(
      <VenueStructuredData venue={venue} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json.address["@type"]).toBe("PostalAddress");
    expect(json.address.streetAddress).toBe("123 Main St");
    expect(json.address.addressLocality).toBe("Nashville");
    expect(json.address.addressRegion).toBe("TN");
  });

  it("includes geo coordinates when latitude and longitude are provided", () => {
    const venue = {
      id: "venue-6",
      name: "Geo Club",
      address: null,
      city: "Denver",
      state: "CO",
      website: null,
      capacity: null,
      latitude: 39.7392,
      longitude: -104.9903,
    };

    const { container } = render(
      <VenueStructuredData venue={venue} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json.geo).toEqual({
      "@type": "GeoCoordinates",
      latitude: 39.7392,
      longitude: -104.9903,
    });
  });

  it("omits geo when coordinates are not provided", () => {
    const venue = {
      id: "venue-7",
      name: "No Geo Club",
      address: null,
      city: "NYC",
      state: "NY",
      website: null,
      capacity: null,
    };

    const { container } = render(
      <VenueStructuredData venue={venue} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json).not.toHaveProperty("geo");
  });

  it("includes image from first photo", () => {
    const venue = {
      id: "venue-8",
      name: "Photo Club",
      address: null,
      city: "NYC",
      state: "NY",
      website: null,
      capacity: null,
      photos: [{ url: "https://example.com/photo.jpg" }],
    };

    const { container } = render(
      <VenueStructuredData venue={venue} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json.image).toBe("https://example.com/photo.jpg");
  });

  it("omits image when no photos", () => {
    const venue = {
      id: "venue-9",
      name: "No Photo Club",
      address: null,
      city: "NYC",
      state: "NY",
      website: null,
      capacity: null,
      photos: [],
    };

    const { container } = render(
      <VenueStructuredData venue={venue} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json).not.toHaveProperty("image");
  });

  it("includes telephone when phone is provided", () => {
    const venue = {
      id: "venue-10",
      name: "Phone Club",
      address: null,
      city: "NYC",
      state: "NY",
      website: null,
      capacity: null,
      phone: "+1-212-555-0100",
    };

    const { container } = render(
      <VenueStructuredData venue={venue} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json.telephone).toBe("+1-212-555-0100");
  });

  it("includes description with default when not provided", () => {
    const venue = {
      id: "venue-11",
      name: "Funny Place",
      address: null,
      city: "Chicago",
      state: "IL",
      website: null,
      capacity: null,
    };

    const { container } = render(
      <VenueStructuredData venue={venue} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json.description).toBe("Comedy venue Funny Place in Chicago, IL.");
  });

  it("uses custom description when provided", () => {
    const venue = {
      id: "venue-12",
      name: "Custom Desc Club",
      address: null,
      city: "NYC",
      state: "NY",
      website: null,
      capacity: null,
      description: "The best comedy in town.",
    };

    const { container } = render(
      <VenueStructuredData venue={venue} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json.description).toBe("The best comedy in town.");
  });
});

// ---------------------------------------------------------------------------
// ComedianStructuredData
// ---------------------------------------------------------------------------

describe("ComedianStructuredData", () => {
  it("renders JSON-LD script with Person schema", () => {
    const comedian = {
      id: "c1",
      name: "Dave Chappelle",
      slug: "dave-chappelle",
      bio: "American stand-up comedian and actor.",
      headshotUrl: "https://example.com/chappelle.jpg",
      website: "https://davechappelle.com",
      socialLinks: [
        { platform: "instagram", url: "https://instagram.com/davechappelle" },
      ],
    };

    const { container } = render(
      <ComedianStructuredData comedian={comedian} baseUrl="https://example.com" />
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();
    const json = JSON.parse(script!.textContent!);
    expect(json["@type"]).toBe("Person");
    expect(json.name).toBe("Dave Chappelle");
    expect(json.jobTitle).toBe("Comedian");
    expect(json.url).toBe("https://example.com/comedians/dave-chappelle");
    expect(json.image).toBe("https://example.com/chappelle.jpg");
    expect(json.sameAs).toContain("https://davechappelle.com");
    expect(json.sameAs).toContain("https://instagram.com/davechappelle");
  });

  it("omits image when headshotUrl is null", () => {
    const comedian = {
      id: "c2",
      name: "Test",
      slug: "test",
      bio: null,
      headshotUrl: null,
      website: null,
      socialLinks: [],
    };

    const { container } = render(
      <ComedianStructuredData comedian={comedian} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json).not.toHaveProperty("image");
  });

  it("omits sameAs when no website and no social links", () => {
    const comedian = {
      id: "c3",
      name: "Test",
      slug: "test",
      bio: null,
      headshotUrl: null,
      website: null,
      socialLinks: [],
    };

    const { container } = render(
      <ComedianStructuredData comedian={comedian} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json).not.toHaveProperty("sameAs");
  });

  it("uses default description when bio is null", () => {
    const comedian = {
      id: "c4",
      name: "Jane Smith",
      slug: "jane-smith",
      bio: null,
      headshotUrl: null,
      website: null,
      socialLinks: [],
    };

    const { container } = render(
      <ComedianStructuredData comedian={comedian} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json.description).toBe(
      "Comedian profile and upcoming shows for Jane Smith."
    );
  });

  it("uses bio as description when present", () => {
    const comedian = {
      id: "c5",
      name: "Jane",
      slug: "jane",
      bio: "A great comedian.",
      headshotUrl: null,
      website: null,
      socialLinks: [],
    };

    const { container } = render(
      <ComedianStructuredData comedian={comedian} baseUrl="https://example.com" />
    );
    const json = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );
    expect(json.description).toBe("A great comedian.");
  });
});
