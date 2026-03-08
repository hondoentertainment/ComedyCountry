import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PromotedContent } from "./PromotedContent";

describe("PromotedContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when no promotions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ promotions: [] }),
    }));

    const { container } = render(<PromotedContent type="VENUE_FEATURED" />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/promoted?type=VENUE_FEATURED&limit=2");
    });
    expect(container.children).toHaveLength(0);
  });

  it("renders promoted comedian", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        promotions: [{
          id: "p1",
          type: "COMEDIAN_SPOTLIGHT",
          headline: "Hot comedian!",
          comedian: { id: "c1", name: "Dave", slug: "dave", headshotUrl: null },
          venue: null,
          event: null,
        }],
      }),
    }));

    render(<PromotedContent type="COMEDIAN_SPOTLIGHT" />);
    await waitFor(() => {
      expect(screen.getByText("Hot comedian!")).toBeInTheDocument();
    });
    expect(screen.getByText("Promoted")).toBeInTheDocument();
  });

  it("renders promoted venue", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        promotions: [{
          id: "p2",
          type: "VENUE_FEATURED",
          headline: null,
          comedian: null,
          venue: { id: "v1", name: "Comedy Club", city: "NYC", state: "NY" },
          event: null,
        }],
      }),
    }));

    render(<PromotedContent type="VENUE_FEATURED" />);
    await waitFor(() => {
      expect(screen.getByText("Comedy Club")).toBeInTheDocument();
    });
    expect(screen.getByText(/Sponsored venue/)).toBeInTheDocument();
  });

  it("renders nothing on fetch error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fail")));

    const { container } = render(<PromotedContent type="VENUE_FEATURED" />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    expect(container.children).toHaveLength(0);
  });
});
