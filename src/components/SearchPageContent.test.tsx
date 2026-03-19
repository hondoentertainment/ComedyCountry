import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchPageContent } from "./SearchPageContent";
import type { SearchResponse } from "@/types/search";

const mockGet = vi.fn();
const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace, push: mockPush })),
  useSearchParams: vi.fn(() => ({ get: mockGet })),
}));

function buildResponse(
  overrides: Partial<SearchResponse> = {},
): SearchResponse {
  return {
    results: [],
    facets: {
      cities: [],
      states: [],
      genres: [],
      venueTypes: [],
      showTypes: [],
      touringStatuses: [],
    },
    totalCounts: { venues: 0, comedians: 0, events: 0, total: 0 },
    query: "",
    suggestions: [],
    filters: {},
    pagination: { limit: 20, offset: 0, hasMore: false },
    ...overrides,
  };
}

describe("SearchPageContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue(null);
  });

  it("renders search heading and input", () => {
    render(<SearchPageContent initialQuery="" initialResults={null} />);

    expect(screen.getByRole("heading", { name: "Search" })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search venues, comedians, events...")
    ).toBeInTheDocument();
  });

  it("shows message when query is less than 2 characters", () => {
    mockGet.mockImplementation((k: string) => (k === "q" ? "a" : null));
    render(<SearchPageContent initialQuery="a" initialResults={null} />);

    expect(
      screen.getByText(/Enter at least 2 characters to search/i)
    ).toBeInTheDocument();
  });

  it("displays initial comedian results when provided", () => {
    mockGet.mockImplementation((k: string) => (k === "q" ? "comedy" : null));
    render(
      <SearchPageContent
        initialQuery="comedy"
        initialResults={buildResponse({
          results: [
            {
              type: "comedian",
              id: "c1",
              name: "Dave Chappelle",
              slug: "dave-chappelle",
              headshotUrl: null,
              genres: ["observational"],
              touringStatus: "TOURING",
              followerCount: 100,
              upcomingShows: 5,
              relevanceScore: 10,
            },
          ],
          totalCounts: { venues: 0, comedians: 1, events: 0, total: 1 },
          query: "comedy",
        })}
      />
    );

    expect(screen.getByText("Dave Chappelle")).toBeInTheDocument();
  });

  it("displays initial venue results when provided", () => {
    mockGet.mockImplementation((k: string) => (k === "q" ? "club" : null));
    render(
      <SearchPageContent
        initialQuery="club"
        initialResults={buildResponse({
          results: [
            {
              type: "venue",
              id: "v1",
              name: "Comedy Club",
              city: "NYC",
              state: "NY",
              venueType: "CLUB",
              capacity: 200,
              followerCount: 50,
              eventCount: 10,
              relevanceScore: 8,
            },
          ],
          totalCounts: { venues: 1, comedians: 0, events: 0, total: 1 },
          query: "club",
        })}
      />
    );

    expect(screen.getByText("Comedy Club")).toBeInTheDocument();
  });

  it("displays initial event results when provided", () => {
    mockGet.mockImplementation((k: string) => (k === "q" ? "show" : null));
    render(
      <SearchPageContent
        initialQuery="show"
        initialResults={buildResponse({
          results: [
            {
              type: "event",
              id: "e1",
              title: "Stand Up Night",
              date: "2025-03-15T00:00:00.000Z",
              showtime: "8:00 PM",
              showType: "HEADLINE",
              priceMin: 20,
              priceMax: 50,
              venue: { id: "v1", name: "The Club", city: "LA", state: "CA" },
              comedians: [{ id: "c1", name: "Comic", slug: "comic" }],
              attendeeCount: 30,
              ticketsAvailable: true,
              relevanceScore: 7,
            },
          ],
          totalCounts: { venues: 0, comedians: 0, events: 1, total: 1 },
          query: "show",
        })}
      />
    );

    expect(screen.getByText("Stand Up Night")).toBeInTheDocument();
  });

  it("shows no results message when results are empty", () => {
    mockGet.mockImplementation((k: string) =>
      k === "q" ? "xyznonexistent" : null
    );
    render(
      <SearchPageContent
        initialQuery="xyznonexistent"
        initialResults={buildResponse({
          query: "xyznonexistent",
        })}
      />
    );

    expect(screen.getByText(/No results for/i)).toBeInTheDocument();
  });

  it("input is editable and has correct type", () => {
    mockGet.mockReturnValue(null);
    render(<SearchPageContent initialQuery="" initialResults={null} />);

    const input = screen.getByPlaceholderText("Search venues, comedians, events...");
    expect(input).toHaveAttribute("type", "search");
  });
});
