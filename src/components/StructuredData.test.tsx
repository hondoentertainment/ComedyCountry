import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { EventStructuredData, VenueStructuredData } from "./StructuredData";

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
