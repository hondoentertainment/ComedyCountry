import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchPageContent } from "./SearchPageContent";

const mockGet = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace })),
  useSearchParams: vi.fn(() => ({ get: mockGet })),
}));

describe("SearchPageContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue(null);
  });

  it("renders search heading and input", () => {
    render(<SearchPageContent initialQuery="" initialResults={null} />);

    expect(screen.getByRole("heading", { name: "Search" })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search venues, comedians, events…")
    ).toBeInTheDocument();
  });

  it("shows message when query is less than 2 characters", () => {
    mockGet.mockImplementation((k: string) => (k === "q" ? "a" : null));
    render(<SearchPageContent initialQuery="a" initialResults={null} />);

    expect(
      screen.getByText(/Enter at least 2 characters to search/i)
    ).toBeInTheDocument();
  });

  it("displays initial comedians when provided", () => {
    mockGet.mockImplementation((k: string) => (k === "q" ? "comedy" : null));
    render(
      <SearchPageContent
        initialQuery="comedy"
        initialResults={{
          venues: [],
          comedians: [
            { id: "c1", name: "Dave Chappelle", slug: "dave-chappelle", headshotUrl: null },
          ],
          events: [],
        }}
      />
    );

    expect(screen.getByRole("heading", { name: /Comedians \(1\)/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Dave Chappelle/ })).toBeInTheDocument();
  });

  it("displays initial venues when provided", () => {
    mockGet.mockImplementation((k: string) => (k === "q" ? "club" : null));
    render(
      <SearchPageContent
        initialQuery="club"
        initialResults={{
          venues: [
            { id: "v1", name: "Comedy Club", city: "NYC", state: "NY", type: "CLUB" },
          ],
          comedians: [],
          events: [],
        }}
      />
    );

    expect(screen.getByRole("heading", { name: /Venues \(1\)/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Comedy Club/ })).toBeInTheDocument();
  });

  it("displays initial events when provided", () => {
    mockGet.mockImplementation((k: string) => (k === "q" ? "show" : null));
    render(
      <SearchPageContent
        initialQuery="show"
        initialResults={{
          venues: [],
          comedians: [],
          events: [
            {
              id: "e1",
              title: "Stand Up Night",
              date: "2025-03-15",
              venue: { name: "The Club", city: "LA", state: "CA" },
              comedians: [{ comedian: { name: "Comic" } }],
            },
          ],
        }}
      />
    );

    expect(screen.getByRole("heading", { name: /Events \(1\)/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Stand Up Night/ })).toBeInTheDocument();
  });

  it("shows no results message when results are empty", () => {
    mockGet.mockImplementation((k: string) =>
      k === "q" ? "xyznonexistent" : null
    );
    render(
      <SearchPageContent
        initialQuery="xyznonexistent"
        initialResults={{
          venues: [],
          comedians: [],
          events: [],
        }}
      />
    );

    expect(screen.getByText(/No results for .xyznonexistent./i)).toBeInTheDocument();
  });

  it("input is editable and has correct type", () => {
    mockGet.mockReturnValue(null);
    render(<SearchPageContent initialQuery="" initialResults={null} />);

    const input = screen.getByPlaceholderText("Search venues, comedians, events…");
    expect(input).toHaveAttribute("type", "search");
    expect(input).toHaveAttribute("minlength", "2");
  });
});
