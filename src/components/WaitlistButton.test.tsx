import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WaitlistButton from "./WaitlistButton";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("WaitlistButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Notify Me' button initially", async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({ onWaitlist: false, count: 0 }),
    });

    render(<WaitlistButton eventId="event-1" />);

    await waitFor(() => {
      expect(screen.getByText("Notify Me")).toBeInTheDocument();
    });
  });

  it("shows 'On Waitlist' when already on waitlist", async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({ onWaitlist: true, count: 3 }),
    });

    render(<WaitlistButton eventId="event-1" />);

    await waitFor(() => {
      expect(screen.getByText("On Waitlist")).toBeInTheDocument();
      expect(screen.getByText("(3)")).toBeInTheDocument();
    });
  });

  it("shows position count after joining", async () => {
    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({ onWaitlist: false, count: 5 }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ onWaitlist: true }),
      });

    render(<WaitlistButton eventId="event-1" />);

    await waitFor(() => {
      expect(screen.getByText("Notify Me")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("On Waitlist")).toBeInTheDocument();
      expect(screen.getByText("(6)")).toBeInTheDocument();
    });
  });

  it("handles fetch error gracefully on initial load", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    render(<WaitlistButton eventId="event-1" />);

    // Should still render the button even if fetch fails
    expect(screen.getByText("Notify Me")).toBeInTheDocument();
  });

  it("handles toggle error gracefully", async () => {
    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({ onWaitlist: false, count: 0 }),
      })
      .mockRejectedValueOnce(new Error("Network error"));

    render(<WaitlistButton eventId="event-1" />);

    await waitFor(() => {
      expect(screen.getByText("Notify Me")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));

    // Should still show "Notify Me" since toggle failed
    await waitFor(() => {
      expect(screen.getByText("Notify Me")).toBeInTheDocument();
    });
  });
});
