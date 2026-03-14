import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClearComediansFiltersLink } from "./ClearComediansFiltersLink";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace })),
}));

describe("ClearComediansFiltersLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Clear filters' link", () => {
    render(<ClearComediansFiltersLink />);
    expect(screen.getByRole("link", { name: "Clear filters" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/comedians");
  });

  it("onClick prevents default and calls router.replace with /comedians", async () => {
    render(<ClearComediansFiltersLink />);
    const link = screen.getByRole("link", { name: "Clear filters" });

    await userEvent.click(link);

    expect(mockReplace).toHaveBeenCalledWith("/comedians");
  });
});
