import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TasteMatchBadge } from "./TasteMatchBadge";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("TasteMatchBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders match percentage", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ matchPct: 85 }),
    });

    render(<TasteMatchBadge comedianId="comedian-1" />);

    await waitFor(() => {
      expect(screen.getByText("85% match")).toBeInTheDocument();
    });
  });

  it("renders nothing when matchPct is 0", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ matchPct: 0 }),
    });

    const { container } = render(<TasteMatchBadge comedianId="comedian-1" />);

    // Wait for the loading state to clear
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Component should render nothing for 0% match
    // Small delay to let state updates propagate
    await waitFor(() => {
      expect(container.querySelector("span")).toBeNull();
    });
  });

  it("renders nothing when API returns error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const { container } = render(<TasteMatchBadge comedianId="comedian-1" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(container.querySelector("span")).toBeNull();
    });
  });

  it("renders nothing when fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { container } = render(<TasteMatchBadge comedianId="comedian-1" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(container.querySelector("span")).toBeNull();
    });
  });

  it("applies green color for high match (>=80)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ matchPct: 90 }),
    });

    render(<TasteMatchBadge comedianId="comedian-1" />);

    await waitFor(() => {
      const badge = screen.getByText("90% match");
      expect(badge.className).toContain("text-green-400");
    });
  });

  it("applies gold color for medium match (50-79)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ matchPct: 65 }),
    });

    render(<TasteMatchBadge comedianId="comedian-1" />);

    await waitFor(() => {
      const badge = screen.getByText("65% match");
      expect(badge.className).toContain("text-brand-gold");
    });
  });

  it("applies zinc color for low match (<50)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ matchPct: 30 }),
    });

    render(<TasteMatchBadge comedianId="comedian-1" />);

    await waitFor(() => {
      const badge = screen.getByText("30% match");
      expect(badge.className).toContain("text-zinc-400");
    });
  });

  it("renders nothing during loading", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // Never resolves

    const { container } = render(<TasteMatchBadge comedianId="comedian-1" />);

    expect(container.querySelector("span")).toBeNull();
  });
});
