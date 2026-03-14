import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckInButton } from "./CheckInButton";

describe("CheckInButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 3 }),
      })
    );
  });

  it("renders Check In button", () => {
    render(<CheckInButton venueId="venue-1" />);

    expect(
      screen.getByRole("button", { name: "Check In" })
    ).toBeInTheDocument();
  });

  it("fetches and displays current check-in count", async () => {
    render(<CheckInButton venueId="venue-1" />);

    await waitFor(() => {
      expect(screen.getByText("3 people here now")).toBeInTheDocument();
    });
  });

  it("shows singular 'person' for count of 1", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 1 }),
      })
    );

    render(<CheckInButton venueId="venue-1" />);

    await waitFor(() => {
      expect(screen.getByText("1 person here now")).toBeInTheDocument();
    });
  });

  it("shows Checked In and increments count after successful check-in", async () => {
    const fetchMock = vi
      .fn()
      // First call: GET count
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 5 }),
      })
      // Second call: POST check-in
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckInButton venueId="venue-1" />);

    await waitFor(() => {
      expect(screen.getByText("5 people here now")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Check In" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Checked In" })
      ).toBeInTheDocument();
      expect(screen.getByText("6 people here now")).toBeInTheDocument();
    });
  });

  it("disables button after check-in", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckInButton venueId="venue-1" />);

    await userEvent.click(screen.getByRole("button", { name: "Check In" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Checked In" })
      ).toBeDisabled();
    });
  });

  it("shows error when not authenticated", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 0 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Not authenticated" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckInButton venueId="venue-1" />);

    await userEvent.click(screen.getByRole("button", { name: "Check In" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Sign in to check in");
    });
  });

  it("shows error on API failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 0 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server error" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckInButton venueId="venue-1" />);

    await userEvent.click(screen.getByRole("button", { name: "Check In" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Server error");
    });
  });
});
