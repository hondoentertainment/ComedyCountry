import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "./SearchBar";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

describe("SearchBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when fetch fails (non-AbortError), error message and Retry button appear", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error"))
    );

    render(<SearchBar />);
    const input = screen.getByRole("combobox", { name: /search/i });

    await act(async () => {
      await userEvent.type(input, "ab");
      await new Promise((r) => setTimeout(r, 300));
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/search failed/i);
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });
  });

  it("Retry clears error and refetches", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            venues: [],
            comedians: [],
            events: [],
          }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<SearchBar />);
    const input = screen.getByRole("combobox", { name: /search/i });

    await act(async () => {
      await userEvent.type(input, "ab");
      await new Promise((r) => setTimeout(r, 300));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
