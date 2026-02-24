import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventShareButtons } from "./EventShareButtons";

describe("EventShareButtons", () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no native share (desktop)
    Object.defineProperty(global, "navigator", {
      value: { share: undefined },
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      configurable: true,
    });
  });

  it("renders Share label and copy/X/Facebook when no navigator.share", () => {
    render(
      <EventShareButtons
        title="Test Event"
        url="https://example.com/events/1"
        venueName="Comedy Club"
      />
    );

    expect(screen.getByText("Share:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Share on X (Twitter)" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Share on Facebook" })
    ).toBeInTheDocument();
  });

  it("renders Share button when navigator.share is available", () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, "share", {
      value: mockShare,
      configurable: true,
    });

    render(
      <EventShareButtons
        title="Test Event"
        url="https://example.com/events/1"
      />
    );

    expect(screen.getByRole("button", { name: "Share event" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy link" })).not.toBeInTheDocument();
  });

  it("shows Copied! after copying link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(
      <EventShareButtons
        title="Test Event"
        url="https://example.com/events/1"
      />
    );

    const copyBtn = screen.getByRole("button", { name: "Copy link" });
    await userEvent.click(copyBtn);

    expect(writeText).toHaveBeenCalledWith("https://example.com/events/1");
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("builds correct Twitter share URL with venue", () => {
    render(
      <EventShareButtons
        title="Dave Chappelle"
        url="https://example.com/events/1"
        venueName="Comedy Club NYC"
      />
    );

    const twitterLink = screen.getByRole("link", { name: "Share on X (Twitter)" });
    expect(twitterLink).toHaveAttribute(
      "href",
      expect.stringContaining(
        encodeURIComponent("Dave Chappelle at Comedy Club NYC")
      )
    );
  });
});
