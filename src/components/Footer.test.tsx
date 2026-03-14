import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Footer } from "./Footer";

const mockOpenPreferences = vi.fn();
vi.mock("@/components/CookieConsent", () => ({
  useCookieConsent: () => ({ openPreferences: mockOpenPreferences }),
}));

describe("Footer", () => {
  it("renders copyright with current year", () => {
    render(<Footer />);

    expect(
      screen.getByText(
        new RegExp(`© ${new Date().getFullYear()} Punchline Atlas`)
      )
    ).toBeInTheDocument();
  });

  it("renders Terms & Conditions link", () => {
    render(<Footer />);

    const link = screen.getByText("Terms & Conditions");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/terms");
  });

  it("renders Privacy Policy link", () => {
    render(<Footer />);

    const link = screen.getByText("Privacy Policy");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/privacy");
  });

  it("renders Cookie preferences button", () => {
    render(<Footer />);

    expect(screen.getByText("Cookie preferences")).toBeInTheDocument();
  });

  it("calls openPreferences when Cookie preferences clicked", async () => {
    render(<Footer />);

    await userEvent.click(screen.getByText("Cookie preferences"));

    expect(mockOpenPreferences).toHaveBeenCalled();
  });

  it("has Legal aria-label on nav", () => {
    render(<Footer />);

    expect(screen.getByRole("navigation", { name: "Legal" })).toBeInTheDocument();
  });
});
