import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  EventStructuredData,
  VenueStructuredData,
  ComedianStructuredData,
} from "./StructuredData";

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
});

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
});

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
