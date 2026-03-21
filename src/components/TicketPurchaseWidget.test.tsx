import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TicketPurchaseWidget from "./TicketPurchaseWidget";

// Mock next/navigation
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const ticketTypes = [
  {
    id: "tt-1",
    name: "General Admission",
    price: "25.00",
    capacity: 100,
    sold: 50,
    available: 50,
    onSale: true,
    description: "Standard entry",
    saleStart: null,
    saleEnd: null,
  },
  {
    id: "tt-2",
    name: "VIP",
    price: "75.00",
    capacity: 20,
    sold: 20,
    available: 0,
    onSale: true,
    description: "Premium seating",
    saleStart: null,
    saleEnd: null,
  },
  {
    id: "tt-3",
    name: "Early Bird",
    price: "15.00",
    capacity: 30,
    sold: 0,
    available: 30,
    onSale: false,
    description: null,
    saleStart: null,
    saleEnd: null,
  },
];

describe("TicketPurchaseWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise(() => {}))
    );
    render(<TicketPurchaseWidget eventId="evt-1" />);
    // Loading skeleton has animate-pulse divs
    const container = document.querySelector(".animate-pulse");
    expect(container).toBeTruthy();
  });

  it("renders ticket types after loading", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(ticketTypes),
      })
    );

    render(<TicketPurchaseWidget eventId="evt-1" />);

    await waitFor(() => {
      expect(screen.getByText("Get Tickets")).toBeInTheDocument();
    });
    expect(screen.getByText("General Admission")).toBeInTheDocument();
    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.getByText("Early Bird")).toBeInTheDocument();
  });

  it("renders nothing when no ticket types returned", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );

    const { container } = render(<TicketPurchaseWidget eventId="evt-1" />);

    await waitFor(() => {
      expect(container.querySelector(".animate-pulse")).not.toBeTruthy();
    });
    expect(screen.queryByText("Get Tickets")).not.toBeInTheDocument();
  });

  it("shows 'Sold Out' for unavailable ticket types", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(ticketTypes),
      })
    );

    render(<TicketPurchaseWidget eventId="evt-1" />);

    await waitFor(() => {
      expect(screen.getByText("Sold Out")).toBeInTheDocument();
    });
  });

  it("shows 'Not On Sale' for ticket types not on sale", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(ticketTypes),
      })
    );

    render(<TicketPurchaseWidget eventId="evt-1" />);

    await waitFor(() => {
      expect(screen.getByText("Not On Sale")).toBeInTheDocument();
    });
  });

  it("auto-selects the first available ticket type", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(ticketTypes),
      })
    );

    render(<TicketPurchaseWidget eventId="evt-1" />);

    await waitFor(() => {
      // Quantity controls should be visible for auto-selected type
      expect(screen.getByText("Quantity")).toBeInTheDocument();
    });
  });

  it("shows quantity controls and allows increment/decrement", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(ticketTypes),
      })
    );

    render(<TicketPurchaseWidget eventId="evt-1" />);

    await waitFor(() => {
      expect(screen.getByText("Quantity")).toBeInTheDocument();
    });

    // Default quantity is 1; click + to make it 2
    const plusBtn = screen.getByText("+");
    await userEvent.click(plusBtn);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("$50.00 total")).toBeInTheDocument();

    // Click - to go back to 1
    const minusBtn = screen.getByText("-");
    await userEvent.click(minusBtn);
    expect(screen.getByText("$25.00 total")).toBeInTheDocument();
  });

  it("does not decrement quantity below 1", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(ticketTypes),
      })
    );

    render(<TicketPurchaseWidget eventId="evt-1" />);

    await waitFor(() => {
      expect(screen.getByText("Quantity")).toBeInTheDocument();
    });

    const minusBtn = screen.getByText("-");
    await userEvent.click(minusBtn);
    // Quantity should still be 1
    expect(screen.getByText("$25.00 total")).toBeInTheDocument();
  });

  it("purchases tickets successfully", async () => {
    const fetchMock = vi
      .fn()
      // First call: fetch ticket types
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(ticketTypes),
      })
      // Second call: purchase
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "ticket-1" }),
      })
      // Third call: refresh ticket types
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(ticketTypes),
      });

    vi.stubGlobal("fetch", fetchMock);

    render(<TicketPurchaseWidget eventId="evt-1" />);

    await waitFor(() => {
      expect(screen.getByText("Get Tickets")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Buy 1 Ticket"));

    await waitFor(() => {
      expect(
        screen.getByText("1 ticket purchased! Check your tickets page.")
      ).toBeInTheDocument();
    });
  });

  it("shows 'View My Tickets' link after successful purchase", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(ticketTypes),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "ticket-1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(ticketTypes),
      });

    vi.stubGlobal("fetch", fetchMock);

    render(<TicketPurchaseWidget eventId="evt-1" />);

    await waitFor(() => {
      expect(screen.getByText("Buy 1 Ticket")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Buy 1 Ticket"));

    await waitFor(() => {
      expect(screen.getByText("View My Tickets")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("View My Tickets"));
    expect(pushMock).toHaveBeenCalledWith("/tickets");
  });

  it("shows error on purchase failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(ticketTypes),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Not enough tickets" }),
      });

    vi.stubGlobal("fetch", fetchMock);

    render(<TicketPurchaseWidget eventId="evt-1" />);

    await waitFor(() => {
      expect(screen.getByText("Buy 1 Ticket")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Buy 1 Ticket"));

    await waitFor(() => {
      expect(screen.getByText("Not enough tickets")).toBeInTheDocument();
    });
  });

  it("shows error on network failure during purchase", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(ticketTypes),
      })
      .mockRejectedValueOnce(new Error("Network error"));

    vi.stubGlobal("fetch", fetchMock);

    render(<TicketPurchaseWidget eventId="evt-1" />);

    await waitFor(() => {
      expect(screen.getByText("Buy 1 Ticket")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Buy 1 Ticket"));

    await waitFor(() => {
      expect(
        screen.getByText("Purchase failed. Please try again.")
      ).toBeInTheDocument();
    });
  });

  it("shows Processing... while purchasing", async () => {
    let resolvePurchase: (value: unknown) => void;
    const purchasePromise = new Promise((resolve) => {
      resolvePurchase = resolve;
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(ticketTypes),
      })
      .mockReturnValueOnce(purchasePromise);

    vi.stubGlobal("fetch", fetchMock);

    render(<TicketPurchaseWidget eventId="evt-1" />);

    await waitFor(() => {
      expect(screen.getByText("Buy 1 Ticket")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Buy 1 Ticket"));

    expect(screen.getByText("Processing...")).toBeInTheDocument();

    // Clean up
    resolvePurchase!({
      ok: true,
      json: () => Promise.resolve({ id: "t-1" }),
    });
  });

  it("updates buy button text for multiple tickets", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(ticketTypes),
      })
    );

    render(<TicketPurchaseWidget eventId="evt-1" />);

    await waitFor(() => {
      expect(screen.getByText("Buy 1 Ticket")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("+"));
    expect(screen.getByText("Buy 2 Tickets")).toBeInTheDocument();
  });
});
