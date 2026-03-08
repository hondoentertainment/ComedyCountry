import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketButton } from "./TicketButton";

describe("TicketButton", () => {
  const originalOpen = window.open;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("open", vi.fn());
  });

  it("renders with default text", () => {
    render(<TicketButton eventId="e1" ticketUrl="https://tickets.com/show" />);
    expect(screen.getByText("Get tickets")).toBeInTheDocument();
  });

  it("renders with custom children", () => {
    render(
      <TicketButton eventId="e1" ticketUrl="https://tickets.com/show">
        Buy now
      </TicketButton>
    );
    expect(screen.getByText("Buy now")).toBeInTheDocument();
  });

  it("tracks click and opens affiliate URL on success", async () => {
    const affiliateUrl = "https://tickets.com/show?ref=punchline";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: affiliateUrl }),
    }));

    render(<TicketButton eventId="e1" ticketUrl="https://tickets.com/show" />);
    await userEvent.click(screen.getByText("Get tickets"));

    expect(fetch).toHaveBeenCalledWith("/api/tickets/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: "e1",
        ticketUrl: "https://tickets.com/show",
        referrer: "/",
      }),
    });
    expect(window.open).toHaveBeenCalledWith(affiliateUrl, "_blank", "noopener,noreferrer");
  });

  it("opens original URL on fetch failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    render(<TicketButton eventId="e1" ticketUrl="https://tickets.com/show" />);
    await userEvent.click(screen.getByText("Get tickets"));

    expect(window.open).toHaveBeenCalledWith("https://tickets.com/show", "_blank", "noopener,noreferrer");
  });

  it("opens original URL on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    render(<TicketButton eventId="e1" ticketUrl="https://tickets.com/show" />);
    await userEvent.click(screen.getByText("Get tickets"));

    expect(window.open).toHaveBeenCalledWith("https://tickets.com/show", "_blank", "noopener,noreferrer");
  });

  it("renders as an anchor element", () => {
    render(<TicketButton eventId="e1" ticketUrl="https://tickets.com/show" />);
    const link = screen.getByText("Get tickets");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "https://tickets.com/show");
  });
});
