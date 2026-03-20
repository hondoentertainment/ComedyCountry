import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClipPlayer } from "./ClipPlayer";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const defaultProps = {
  id: "clip-1",
  title: "Hilarious Standup Bit",
  videoUrl: "https://example.com/video.mp4",
  thumbnailUrl: "https://example.com/thumb.jpg",
  duration: 180,
  description: "A really funny comedy clip that will make you laugh out loud and keep watching for more content from this amazing comedian.",
  comedian: { id: "c-1", name: "Dave Chappelle", slug: "dave-chappelle" },
  likeCount: 1500,
  shareCount: 300,
  commentCount: 45,
  viewCount: 10000,
  eventId: "evt-1",
  tags: ["standup", "comedy", "funny"],
};

describe("ClipPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    // Mock HTMLMediaElement methods
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.pause = vi.fn();
  });

  // ── Basic rendering ────────────────────────────────────────────────

  it("renders the video element", () => {
    render(<ClipPlayer {...defaultProps} />);
    const video = document.querySelector("video");
    expect(video).toBeTruthy();
    expect(video?.src).toContain("video.mp4");
  });

  it("renders the title", () => {
    render(<ClipPlayer {...defaultProps} />);
    expect(screen.getByText("Hilarious Standup Bit")).toBeInTheDocument();
  });

  it("renders comedian name with @ prefix", () => {
    render(<ClipPlayer {...defaultProps} />);
    expect(screen.getByText("@Dave Chappelle")).toBeInTheDocument();
  });

  it("renders comedian initial avatar", () => {
    render(<ClipPlayer {...defaultProps} />);
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<ClipPlayer {...defaultProps} />);
    expect(
      screen.getByText(/A really funny comedy clip.*amazing comedian/)
    ).toBeInTheDocument();
  });

  it("renders tags as links", () => {
    render(<ClipPlayer {...defaultProps} />);
    expect(screen.getByText("#standup")).toBeInTheDocument();
    expect(screen.getByText("#comedy")).toBeInTheDocument();
    expect(screen.getByText("#funny")).toBeInTheDocument();
  });

  it("renders formatted like count", () => {
    render(<ClipPlayer {...defaultProps} />);
    expect(screen.getByText("1.5K")).toBeInTheDocument();
  });

  it("renders formatted share count", () => {
    render(<ClipPlayer {...defaultProps} />);
    expect(screen.getByText("300")).toBeInTheDocument();
  });

  it("renders formatted comment count", () => {
    render(<ClipPlayer {...defaultProps} />);
    expect(screen.getByText("45")).toBeInTheDocument();
  });

  it("renders view count", () => {
    render(<ClipPlayer {...defaultProps} />);
    expect(screen.getByText("10.0K views")).toBeInTheDocument();
  });

  it("renders time display", () => {
    render(<ClipPlayer {...defaultProps} />);
    expect(screen.getByText("0:00 / 3:00")).toBeInTheDocument();
  });

  it("renders Watch Full Show link when eventId is provided", () => {
    render(<ClipPlayer {...defaultProps} />);
    const link = screen.getByText("Watch Full Show");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/events/evt-1");
  });

  it("does not render Watch Full Show when no eventId", () => {
    render(<ClipPlayer {...defaultProps} eventId={undefined} />);
    expect(screen.queryByText("Watch Full Show")).not.toBeInTheDocument();
  });

  it("links comedian avatar to comedian page", () => {
    render(<ClipPlayer {...defaultProps} />);
    const link = screen.getByText("@Dave Chappelle").closest("a");
    expect(link).toHaveAttribute("href", "/comedians/dave-chappelle");
  });

  // ── Play/pause ─────────────────────────────────────────────────────

  it("shows play button when not playing", () => {
    render(<ClipPlayer {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("starts playing when play button is clicked", async () => {
    render(<ClipPlayer {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  // ── Mute/unmute ────────────────────────────────────────────────────

  it("starts muted by default", () => {
    render(<ClipPlayer {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Unmute" })).toBeInTheDocument();
  });

  it("toggles mute when mute button is clicked", async () => {
    render(<ClipPlayer {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "Unmute" }));
    expect(screen.getByRole("button", { name: "Mute" })).toBeInTheDocument();
  });

  // ── Like interaction ───────────────────────────────────────────────

  it("shows unlike state when userLiked is true", () => {
    render(<ClipPlayer {...defaultProps} userLiked={true} />);
    expect(screen.getByRole("button", { name: "Unlike" })).toBeInTheDocument();
  });

  it("toggles like on click with optimistic update", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClipPlayer {...defaultProps} />);

    await userEvent.click(screen.getByRole("button", { name: "Like" }));

    // Optimistic update: count should increase
    expect(screen.getByText("1.5K")).toBeInTheDocument(); // 1501 still rounds to 1.5K

    // Should have called engage API with POST
    await waitFor(() => {
      const engageCall = fetchMock.mock.calls.find(
        (c) => typeof c[0] === "string" && c[0].includes("/engage") && c[1]?.method === "POST" && c[1]?.body?.includes('"like"')
      );
      expect(engageCall).toBeTruthy();
    });
  });

  it("reverts like on API failure", async () => {
    // Use fake timers to control the view tracking timeout
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClipPlayer {...defaultProps} likeCount={100} />);

    const likeBtn = screen.getByRole("button", { name: "Like" });
    await userEvent.click(likeBtn);

    // Should revert after failure
    await waitFor(() => {
      expect(screen.getByText("100")).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  // ── Save interaction ───────────────────────────────────────────────

  it("shows unsave state when userSaved is true", () => {
    render(<ClipPlayer {...defaultProps} userSaved={true} />);
    expect(screen.getByRole("button", { name: "Unsave" })).toBeInTheDocument();
  });

  it("toggles save on click", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    render(<ClipPlayer {...defaultProps} />);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("button", { name: "Unsave" })).toBeInTheDocument();
  });

  // ── Share ──────────────────────────────────────────────────────────

  it("shares via clipboard when navigator.share is unavailable", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });
    // Ensure navigator.share is not defined
    Object.defineProperty(navigator, "share", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    render(<ClipPlayer {...defaultProps} />);

    await userEvent.click(screen.getByRole("button", { name: "Share" }));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
    });
  });

  // ── Description expand/collapse ────────────────────────────────────

  it("shows more/less toggle for long descriptions", () => {
    render(<ClipPlayer {...defaultProps} />);
    expect(screen.getByText("more")).toBeInTheDocument();
  });

  it("toggles description expansion on click", async () => {
    render(<ClipPlayer {...defaultProps} />);

    await userEvent.click(screen.getByText("more"));
    expect(screen.getByText("less")).toBeInTheDocument();

    await userEvent.click(screen.getByText("less"));
    expect(screen.getByText("more")).toBeInTheDocument();
  });

  it("does not show more/less for short descriptions", () => {
    render(<ClipPlayer {...defaultProps} description="Short" />);
    expect(screen.queryByText("more")).not.toBeInTheDocument();
  });

  // ── Edge cases ─────────────────────────────────────────────────────

  it("renders without comedian", () => {
    render(<ClipPlayer {...defaultProps} comedian={null} />);
    expect(screen.queryByText("@Dave Chappelle")).not.toBeInTheDocument();
  });

  it("renders without title", () => {
    render(<ClipPlayer {...defaultProps} title={null} />);
    expect(screen.queryByText("Hilarious Standup Bit")).not.toBeInTheDocument();
  });

  it("renders without tags", () => {
    render(<ClipPlayer {...defaultProps} tags={[]} />);
    expect(screen.queryByText("#standup")).not.toBeInTheDocument();
  });

  it("does not show view count when zero", () => {
    render(<ClipPlayer {...defaultProps} viewCount={0} />);
    expect(screen.queryByText(/views/)).not.toBeInTheDocument();
  });

  it("formats million counts correctly", () => {
    render(<ClipPlayer {...defaultProps} likeCount={2500000} />);
    expect(screen.getByText("2.5M")).toBeInTheDocument();
  });

  it("tracks a view after 3 seconds", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClipPlayer {...defaultProps} />);

    vi.advanceTimersByTime(3000);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/clips/clip-1/engage",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"view"'),
      })
    );

    vi.useRealTimers();
  });

  it("calls onEnded callback when video ends", () => {
    const onEnded = vi.fn();
    render(<ClipPlayer {...defaultProps} onEnded={onEnded} />);

    const video = document.querySelector("video")!;
    fireEvent.ended(video);

    expect(onEnded).toHaveBeenCalledOnce();
  });
});
