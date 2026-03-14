import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttendanceButtons } from "./AttendanceButtons";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

describe("AttendanceButtons", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-1", name: "Test" }, expires: "" },
      status: "authenticated",
      update: vi.fn(),
    });
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });
    // Default fetch for attendance counts
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ going: 5, interested: 10, userStatus: null }),
      })
    );
  });

  it("renders Going and Interested buttons", () => {
    render(<AttendanceButtons eventId="event-1" />);

    expect(screen.getByText("I'm going")).toBeInTheDocument();
    expect(screen.getByText("Interested")).toBeInTheDocument();
  });

  it("fetches attendance data on mount", async () => {
    render(<AttendanceButtons eventId="event-1" />);

    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
    });
  });

  it("redirects unauthenticated user to sign-in", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    render(<AttendanceButtons eventId="event-1" />);

    await userEvent.click(screen.getByText("I'm going"));

    expect(mockPush).toHaveBeenCalledWith(
      "/auth/signin?callbackUrl=/events/event-1"
    );
  });

  it("marks Going on successful RSVP", async () => {
    const fetchMock = vi
      .fn()
      // First call: initial load
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ going: 0, interested: 0, userStatus: null }),
      })
      // Second call: POST going
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ userStatus: "going" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<AttendanceButtons eventId="event-1" />);

    await waitFor(() => {
      expect(screen.getByText("I'm going")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("I'm going"));

    await waitFor(() => {
      expect(screen.getByText("Going")).toBeInTheDocument();
    });
  });
});
