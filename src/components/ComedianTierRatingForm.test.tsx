import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComedianTierRatingForm } from "./ComedianTierRatingForm";

describe("ComedianTierRatingForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders tier buttons S through F", () => {
    render(
      <ComedianTierRatingForm
        comedianId="c1"
        comedianName="Dave Chappelle"
        comedianSlug="dave-chappelle"
      />
    );
    expect(screen.getByRole("button", { name: "Rate as S tier" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rate as A tier" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rate as B tier" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rate as C tier" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rate as D tier" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rate as F tier" })).toBeInTheDocument();
  });

  it("shows selected tier when initialTier is provided", () => {
    render(
      <ComedianTierRatingForm
        comedianId="c1"
        comedianName="Dave Chappelle"
        comedianSlug="dave-chappelle"
        initialTier="A"
      />
    );
    const aButton = screen.getByRole("button", { name: "Rate as A tier" });
    expect(aButton).toHaveAttribute("aria-pressed", "true");
  });

  it("sends POST on tier selection and shows success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    vi.stubGlobal("fetch", fetchMock);

    const onSuccess = vi.fn();

    render(
      <ComedianTierRatingForm
        comedianId="comedian-abc"
        comedianName="Dave Chappelle"
        comedianSlug="dave-chappelle"
        onSuccess={onSuccess}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Rate as S tier" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/comedians/comedian-abc/tier-rating",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "S" }),
      }
    );
    expect(onSuccess).toHaveBeenCalled();
    expect(screen.getByText("Rating saved")).toBeInTheDocument();
  });

  it("shows Clear rating when tier is selected", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ComedianTierRatingForm
        comedianId="c1"
        comedianName="Dave Chappelle"
        comedianSlug="dave-chappelle"
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Rate as B tier" }));

    expect(screen.getByRole("button", { name: "Clear rating" })).toBeInTheDocument();
  });

  it("sends DELETE on clear rating", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ComedianTierRatingForm
        comedianId="c1"
        comedianName="Dave Chappelle"
        comedianSlug="dave-chappelle"
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Rate as C tier" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear rating" }));

    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/comedians/c1/tier-rating",
      { method: "DELETE" }
    );
  });

  it("shows error on API failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Could not save" }),
    }));

    render(
      <ComedianTierRatingForm
        comedianId="c1"
        comedianName="Dave Chappelle"
        comedianSlug="dave-chappelle"
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Rate as D tier" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
  });

  it("redirects to sign-in with callbackUrl on 401", async () => {
    const locationMock = { href: "" };
    vi.stubGlobal("location", locationMock);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }));

    render(
      <ComedianTierRatingForm
        comedianId="c1"
        comedianName="Dave Chappelle"
        comedianSlug="dave-chappelle"
        signInUrl="/auth/signin"
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Rate as A tier" }));

    expect(locationMock.href).toBe(
      "/auth/signin?callbackUrl=" + encodeURIComponent("/comedians/dave-chappelle")
    );
  });
});
