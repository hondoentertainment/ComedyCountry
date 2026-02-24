import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Nav } from "./Nav";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
  signOut: vi.fn(),
}));

vi.mock("./SearchBar", () => ({
  SearchBar: () => <div data-testid="search-bar" />,
}));

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

describe("Nav", () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue("/");
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    vi.clearAllMocks();
  });

  it("renders Punchline Atlas logo link", () => {
    render(<Nav />);
    const logo = screen.getByRole("link", { name: "Punchline Atlas" });
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("href", "/");
  });

  it("renders main nav links", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: "Discover" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Venues" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Comedians" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Schedule" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Map" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Following" })).toBeInTheDocument();
  });

  it("renders Sign in when not authenticated", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
  });

  it("renders Profile and Sign out when authenticated", () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: "Test", email: "test@example.com" } },
      status: "authenticated",
    });

    render(<Nav />);
    expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("opens mobile menu on burger click", async () => {
    render(<Nav />);
    const menuButton = screen.getByRole("button", { name: "Open menu" });
    await userEvent.click(menuButton);

    expect(screen.getByRole("button", { name: "Close menu" })).toBeInTheDocument();
  });

  it("has Search link on mobile", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: "Search" })).toBeInTheDocument();
  });
});
