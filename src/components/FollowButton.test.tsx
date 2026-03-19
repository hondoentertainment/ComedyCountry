import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FollowButton } from "./FollowButton";

describe("FollowButton", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.stubGlobal("location", { ...originalLocation, href: "" });
    vi.clearAllMocks();
  });

  it("shows Follow when not following", () => {
    render(
      <FollowButton
        type="comedian"
        id="comedian-1"
        initialFollowing={false}
      />
    );
    expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument();
  });

  it("shows Following when following", () => {
    render(
      <FollowButton
        type="comedian"
        id="comedian-1"
        initialFollowing={true}
      />
    );
    expect(screen.getByRole("button", { name: /Following/ })).toBeInTheDocument();
  });

  it("toggles to Following on successful follow", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ following: true }),
    }));

    render(
      <FollowButton
        type="comedian"
        id="comedian-1"
        initialFollowing={false}
      />
    );

    const button = screen.getByRole("button", { name: "Follow" });
    await userEvent.click(button);

    expect(screen.getByRole("button", { name: /Following/ })).toBeInTheDocument();
  });

  it("toggles to Follow on successful unfollow", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ following: false }),
    }));

    render(
      <FollowButton
        type="comedian"
        id="comedian-1"
        initialFollowing={true}
      />
    );

    const button = screen.getByRole("button", { name: /Following/ });
    await userEvent.click(button);

    expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument();
  });

  it("calls correct API endpoint for comedian", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ following: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <FollowButton
        type="comedian"
        id="comedian-123"
        initialFollowing={false}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Follow" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/follow/comedian/comedian-123", {
      method: "POST",
    });
  });

  it("calls correct API endpoint for venue", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ following: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <FollowButton
        type="venue"
        id="venue-456"
        initialFollowing={false}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Follow" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/follow/venue/venue-456", {
      method: "POST",
    });
  });

  it("shows error message on API failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    }));

    render(
      <FollowButton
        type="comedian"
        id="comedian-1"
        initialFollowing={false}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Follow" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Server error");
  });

  it("redirects to sign-in with callbackUrl on 401", async () => {
    const locationMock = { ...originalLocation, href: "", pathname: "/comedians/dave" };
    vi.stubGlobal("location", locationMock);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }));

    render(
      <FollowButton
        type="comedian"
        id="comedian-1"
        initialFollowing={false}
        signInUrl="/auth/signin"
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Follow" }));

    expect(locationMock.href).toMatch(/^\/auth\/signin\?callbackUrl=/);
    expect(locationMock.href).toContain(encodeURIComponent("/comedians/dave"));
  });

  it("reverts to original state on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network")));

    render(
      <FollowButton
        type="comedian"
        id="comedian-1"
        initialFollowing={false}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Follow" }));

    // Should revert to Follow (not following) after error
    expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("disables button while loading", async () => {
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pendingPromise));

    render(
      <FollowButton
        type="comedian"
        id="comedian-1"
        initialFollowing={false}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Follow" }));

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    // Resolve to clean up
    resolvePromise!({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ following: true }),
    });
  });

  it("has correct aria-label when following", () => {
    render(
      <FollowButton
        type="comedian"
        id="comedian-1"
        initialFollowing={true}
      />
    );

    expect(
      screen.getByRole("button", { name: "Following (click to unfollow)" })
    ).toBeInTheDocument();
  });
});
