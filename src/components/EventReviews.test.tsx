import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventReviews } from "./EventReviews";

describe("EventReviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when fetch fails, error message and Retry button appear", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false })
    );

    render(<EventReviews eventId="ev-1" />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/failed to load reviews/i);
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });
  });

  it("Retry triggers fetch again", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            reviews: [],
            total: 0,
            count: 0,
            avgRating: null,
          }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<EventReviews eventId="ev-1" />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/events/ev-1/reviews?page=1"
      );
    });
  });
});
