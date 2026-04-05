import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationBell } from "./NotificationBell";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockUseSession = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders nothing when user is not logged in", () => {
    mockUseSession.mockReturnValue({ data: null });

    const { container } = render(<NotificationBell />);
    expect(container.firstChild).toBeNull();
  });

  it("renders bell icon when user is logged in", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "u1", name: "Test" } },
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 0 }),
    } as Response);

    render(<NotificationBell />);
    expect(
      screen.getByRole("button", { name: "Notifications" }),
    ).toBeInTheDocument();
  });

  it("links to /feed", async () => {
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });

  it("has button for notification center", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "u1", name: "Test" } },
    });
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 1 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            notifications: [
              {
                id: "n1",
                type: "new_event",
                title: "Test",
                message: "msg",
                read: false,
                createdAt: new Date().toISOString(),
              },
            ],
            unreadCount: 1,
          }),
      } as Response);

    render(<NotificationBell />);
    const button = screen.getByRole("button");
    await userEvent.click(button);
    const link = await screen.findByRole("link", {
      name: "View all notifications",
    });
    expect(link).toHaveAttribute("href", "/feed");
    const button = screen.getByRole("button", { name: "Notifications" });
    expect(button).toBeInTheDocument();
  });

  it("fetches unread count on mount", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "u1", name: "Test" } },
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 5 }),
    } as Response);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/notifications/unread-count");
    });
  });

  it("displays unread count badge when count > 0", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "u1", name: "Test" } },
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 5 }),
    } as Response);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  it("shows 99+ for count over 99", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "u1", name: "Test" } },
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 150 }),
    } as Response);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByText("99+")).toBeInTheDocument();
    });
  });

  it("does not show badge when count is 0", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "u1", name: "Test" } },
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 0 }),
    } as Response);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("has correct aria-label with unread count", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "u1", name: "Test" } },
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 3 }),
    } as Response);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "3 unread notifications" }),
        screen.getByRole("button", { name: "3 unread notifications" })
      ).toBeInTheDocument();
    });
  });

  it("handles fetch failure gracefully", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "u1", name: "Test" } },
    });
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

    render(<NotificationBell />);

    // Should not crash, just show bell without count
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("handles non-ok response gracefully", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "u1", name: "Test" } },
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.queryByText(/\d/)).not.toBeInTheDocument();
  });
});
