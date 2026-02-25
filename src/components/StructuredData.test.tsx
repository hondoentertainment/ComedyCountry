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
});
