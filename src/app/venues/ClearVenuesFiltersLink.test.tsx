import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClearVenuesFiltersLink } from "./ClearVenuesFiltersLink";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace })),
}));

describe("ClearVenuesFiltersLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Clear filters' link", () => {
    render(<ClearVenuesFiltersLink />);
    expect(screen.getByRole("link", { name: "Clear filters" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/venues");
  });

  it("onClick prevents default and calls router.replace with /venues", async () => {
    render(<ClearVenuesFiltersLink />);
    const link = screen.getByRole("link", { name: "Clear filters" });

    await userEvent.click(link);

    expect(mockReplace).toHaveBeenCalledWith("/venues");
  });
});
