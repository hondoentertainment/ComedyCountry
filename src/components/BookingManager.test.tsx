import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BookingManager from "./BookingManager";

const mockBookings = [
  {
    id: "bk-1",
    venueId: "v-1",
    comedianId: "c-1",
    requesterId: "u-1",
    date: "2026-05-01T20:00:00Z",
    showType: "Headliner",
    budget: 500,
    message: "Would love to have you perform!",
    status: "PENDING",
    responseNote: null,
    respondedAt: null,
    createdAt: "2026-03-15T10:00:00Z",
    comedian: {
      id: "c-1",
      name: "Dave Chappelle",
      slug: "dave-chappelle",
      headshotUrl: null,
    },
  },
  {
    id: "bk-2",
    venueId: "v-1",
    comedianId: "c-2",
    requesterId: "u-1",
    date: "2026-06-15T20:00:00Z",
    showType: null,
    budget: null,
    message: null,
    status: "CONFIRMED",
    responseNote: "Looking forward to it",
    respondedAt: "2026-03-16T12:00:00Z",
    createdAt: "2026-03-14T10:00:00Z",
    comedian: {
      id: "c-2",
      name: "Ali Wong",
      slug: "ali-wong",
      headshotUrl: null,
    },
  },
];

describe("BookingManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Loading state ──────────────────────────────────────────────────

  it("shows loading skeleton initially", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    render(<BookingManager role="venue" entityId="v-1" />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // ── Basic rendering ────────────────────────────────────────────────

  it("renders bookings after loading", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBookings),
      })
    );

    render(<BookingManager role="venue" entityId="v-1" />);

    await waitFor(() => {
      expect(screen.getByText("Dave Chappelle")).toBeInTheDocument();
    });
    expect(screen.getByText("Ali Wong")).toBeInTheDocument();
  });

  it("shows booking count summary", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBookings),
      })
    );

    render(<BookingManager role="venue" entityId="v-1" />);

    await waitFor(() => {
      expect(screen.getByText("2 bookings")).toBeInTheDocument();
    });
    expect(screen.getByText("1 pending")).toBeInTheDocument();
    expect(screen.getByText("1 confirmed")).toBeInTheDocument();
  });

  it("shows empty state when no bookings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );

    render(<BookingManager role="venue" entityId="v-1" />);

    await waitFor(() => {
      expect(screen.getByText("No booking requests.")).toBeInTheDocument();
    });
  });

  it("renders booking details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBookings),
      })
    );

    render(<BookingManager role="venue" entityId="v-1" />);

    await waitFor(() => {
      expect(screen.getByText("Dave Chappelle")).toBeInTheDocument();
    });

    expect(screen.getByText("Headliner")).toBeInTheDocument();
    expect(screen.getByText("$500.00")).toBeInTheDocument();
    expect(screen.getByText("Would love to have you perform!")).toBeInTheDocument();
  });

  it("renders status badges", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBookings),
      })
    );

    render(<BookingManager role="venue" entityId="v-1" />);

    await waitFor(() => {
      // PENDING appears both as filter pill and as status badge
      const pendingElements = screen.getAllByText("PENDING");
      expect(pendingElements.length).toBeGreaterThanOrEqual(2);
    });
    // CONFIRMED appears as filter pill and status badge
    const confirmedElements = screen.getAllByText("CONFIRMED");
    expect(confirmedElements.length).toBeGreaterThanOrEqual(2);
  });

  // ── Filter pills ──────────────────────────────────────────────────

  it("renders filter pills", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBookings),
      })
    );

    render(<BookingManager role="venue" entityId="v-1" />);

    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
    });
    expect(screen.getByText("PENDING", { selector: "button" })).toBeInTheDocument();
    expect(screen.getByText("ACCEPTED", { selector: "button" })).toBeInTheDocument();
    expect(screen.getByText("DECLINED", { selector: "button" })).toBeInTheDocument();
  });

  it("re-fetches bookings when filter is clicked", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBookings),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BookingManager role="venue" entityId="v-1" />);

    await waitFor(() => {
      expect(screen.getByText("Dave Chappelle")).toBeInTheDocument();
    });

    // Click PENDING filter
    await userEvent.click(screen.getByText("PENDING", { selector: "button" }));

    await waitFor(() => {
      // Should have been called with status param
      const lastCall = fetchMock.mock.calls.at(-1)![0] as string;
      expect(lastCall).toContain("status=PENDING");
    });
  });

  it("fetches with correct param key for comedian role", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BookingManager role="comedian" entityId="c-1" />);

    await waitFor(() => {
      const firstCall = fetchMock.mock.calls[0][0] as string;
      expect(firstCall).toContain("comedianId=c-1");
    });
  });

  it("fetches with correct param key for venue role", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BookingManager role="venue" entityId="v-1" />);

    await waitFor(() => {
      const firstCall = fetchMock.mock.calls[0][0] as string;
      expect(firstCall).toContain("venueId=v-1");
    });
  });

  // ── Respond to booking ────────────────────────────────────────────

  it("shows respond link for pending bookings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBookings),
      })
    );

    render(<BookingManager role="venue" entityId="v-1" />);

    await waitFor(() => {
      expect(screen.getByText("Respond to this request")).toBeInTheDocument();
    });
  });

  it("opens response form when Respond is clicked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBookings),
      })
    );

    render(<BookingManager role="venue" entityId="v-1" />);

    await waitFor(() => {
      expect(screen.getByText("Respond to this request")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Respond to this request"));

    expect(screen.getByPlaceholderText("Add a response note...")).toBeInTheDocument();
    expect(screen.getByText("Accept")).toBeInTheDocument();
    expect(screen.getByText("Counter-offer")).toBeInTheDocument();
    expect(screen.getByText("Decline")).toBeInTheDocument();
  });

  it("accepts a booking", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBookings),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...mockBookings[0], status: "ACCEPTED" }),
      });

    vi.stubGlobal("fetch", fetchMock);

    render(<BookingManager role="venue" entityId="v-1" />);

    await waitFor(() => {
      expect(screen.getByText("Respond to this request")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Respond to this request"));
    await userEvent.click(screen.getByText("Accept"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/bookings/bk-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining('"status":"ACCEPTED"'),
        })
      );
    });
  });

  it("declines a booking", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBookings),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...mockBookings[0], status: "DECLINED" }),
      });

    vi.stubGlobal("fetch", fetchMock);

    render(<BookingManager role="venue" entityId="v-1" />);

    await waitFor(() => {
      expect(screen.getByText("Respond to this request")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Respond to this request"));
    await userEvent.click(screen.getByText("Decline"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/bookings/bk-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining('"status":"DECLINED"'),
        })
      );
    });
  });

  it("sends counter-offer with budget and message", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBookings),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ ...mockBookings[0], status: "NEGOTIATING" }),
      });

    vi.stubGlobal("fetch", fetchMock);

    render(<BookingManager role="venue" entityId="v-1" />);

    await waitFor(() => {
      expect(screen.getByText("Respond to this request")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Respond to this request"));

    // Fill in counter-offer fields
    const budgetInput = screen.getByPlaceholderText("0.00");
    await userEvent.type(budgetInput, "750");

    const messageInput = screen.getByPlaceholderText("Counter-offer details...");
    await userEvent.type(messageInput, "How about this amount?");

    await userEvent.click(screen.getByText("Counter-offer"));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        (call) => call[0] === "/api/bookings/bk-1"
      );
      expect(patchCall).toBeTruthy();
      const body = JSON.parse(patchCall![1].body);
      expect(body.action).toBe("negotiate");
      expect(body.budget).toBe(750);
      expect(body.message).toBe("How about this amount?");
    });
  });

  it("closes response form when Cancel is clicked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBookings),
      })
    );

    render(<BookingManager role="venue" entityId="v-1" />);

    await waitFor(() => {
      expect(screen.getByText("Respond to this request")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Respond to this request"));
    expect(screen.getByText("Accept")).toBeInTheDocument();

    // Use the Cancel button within the response form (last Cancel in DOM)
    const cancelButtons = screen.getAllByText("Cancel");
    await userEvent.click(cancelButtons[cancelButtons.length - 1]);

    expect(screen.queryByText("Accept")).not.toBeInTheDocument();
    expect(screen.getByText("Respond to this request")).toBeInTheDocument();
  });

  // ── Confirm accepted booking ──────────────────────────────────────

  it("shows Confirm Booking button for accepted bookings as venue", async () => {
    const acceptedBooking = {
      ...mockBookings[0],
      status: "ACCEPTED",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([acceptedBooking]),
      })
    );

    render(<BookingManager role="venue" entityId="v-1" />);

    await waitFor(() => {
      expect(screen.getByText("Confirm Booking")).toBeInTheDocument();
    });
  });

  it("does not show Confirm Booking for comedian role", async () => {
    const acceptedBooking = {
      ...mockBookings[0],
      status: "ACCEPTED",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([acceptedBooking]),
      })
    );

    render(<BookingManager role="comedian" entityId="c-1" />);

    await waitFor(() => {
      expect(screen.getByText("Dave Chappelle")).toBeInTheDocument();
    });
    expect(screen.queryByText("Confirm Booking")).not.toBeInTheDocument();
  });

  it("shows response note when present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBookings),
      })
    );

    render(<BookingManager role="venue" entityId="v-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Looking forward to it/)).toBeInTheDocument();
    });
  });
});
