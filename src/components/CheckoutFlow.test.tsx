import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CheckoutFlow from "./CheckoutFlow";

// Mock TicketQRCode since it's a child component
vi.mock("./TicketQRCode", () => ({
  default: ({ ticketData }: { ticketData: { ticketId: string } }) => (
    <div data-testid={`qr-${ticketData.ticketId}`}>QR Code</div>
  ),
}));

const defaultTicketTypes = [
  {
    id: "tt-1",
    name: "General Admission",
    price: 25.0,
    description: "Standard entry",
    available: 10,
    onSale: true,
  },
  {
    id: "tt-2",
    name: "VIP",
    price: 75.0,
    description: "Front row with meet & greet",
    available: 5,
    onSale: true,
  },
  {
    id: "tt-3",
    name: "Balcony",
    price: 15.0,
    description: null,
    available: 0,
    onSale: true,
  },
];

const defaultProps = {
  eventId: "evt-1",
  eventTitle: "Comedy Night Live",
  venueName: "The Laugh Factory",
  eventDate: "2026-04-15T20:00:00Z",
  showtime: "8:00 PM",
  ticketTypes: defaultTicketTypes,
};

describe("CheckoutFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  // ── Basic rendering ────────────────────────────────────────────────

  it("renders event title and venue name", () => {
    render(<CheckoutFlow {...defaultProps} />);
    expect(screen.getByText("Comedy Night Live")).toBeInTheDocument();
    expect(screen.getByText(/The Laugh Factory/)).toBeInTheDocument();
  });

  it("renders step indicators", () => {
    render(<CheckoutFlow {...defaultProps} />);
    expect(screen.getByText("Tickets")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Payment")).toBeInTheDocument();
    expect(screen.getByText("Confirmation")).toBeInTheDocument();
  });

  it("renders ticket types with prices", () => {
    render(<CheckoutFlow {...defaultProps} />);
    expect(screen.getByText("General Admission")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();
    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.getByText("$75.00")).toBeInTheDocument();
  });

  it("shows 'Sold Out' for unavailable tickets", () => {
    render(<CheckoutFlow {...defaultProps} />);
    expect(screen.getByText("Sold Out")).toBeInTheDocument();
  });

  it("renders the Select Tickets heading on step 1", () => {
    render(<CheckoutFlow {...defaultProps} />);
    expect(screen.getByText("Select Tickets")).toBeInTheDocument();
  });

  // ── Ticket selection interactions ──────────────────────────────────

  it("increments ticket quantity when + is clicked", async () => {
    render(<CheckoutFlow {...defaultProps} />);
    const plusButtons = screen.getAllByText("+");
    // Click + for General Admission
    await userEvent.click(plusButtons[0]);

    // Should show quantity 1 and cart summary
    expect(screen.getByText("1 ticket")).toBeInTheDocument();
  });

  it("decrements ticket quantity when - is clicked", async () => {
    render(<CheckoutFlow {...defaultProps} />);
    const plusButtons = screen.getAllByText("+");
    const minusButtons = screen.getAllByText("-");

    // Add 2 tickets
    await userEvent.click(plusButtons[0]);
    await userEvent.click(plusButtons[0]);
    expect(screen.getByText("2 tickets")).toBeInTheDocument();

    // Remove 1
    await userEvent.click(minusButtons[0]);
    expect(screen.getByText("1 ticket")).toBeInTheDocument();
  });

  it("disables Continue button when no tickets selected", () => {
    render(<CheckoutFlow {...defaultProps} />);
    const continueBtn = screen.getByText("Continue");
    expect(continueBtn).toBeDisabled();
  });

  it("enables Continue button after selecting tickets", async () => {
    render(<CheckoutFlow {...defaultProps} />);
    const plusButtons = screen.getAllByText("+");
    await userEvent.click(plusButtons[0]);
    const continueBtn = screen.getByText("Continue");
    expect(continueBtn).not.toBeDisabled();
  });

  it("calls onCancel when Cancel button is clicked", async () => {
    const onCancel = vi.fn();
    render(<CheckoutFlow {...defaultProps} onCancel={onCancel} />);
    await userEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("does not render Cancel button when onCancel is not provided", () => {
    render(<CheckoutFlow {...defaultProps} />);
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });

  // ── Step navigation ────────────────────────────────────────────────

  it("navigates to details step when Continue is clicked", async () => {
    render(<CheckoutFlow {...defaultProps} />);
    const plusButtons = screen.getAllByText("+");
    await userEvent.click(plusButtons[0]);
    await userEvent.click(screen.getByText("Continue"));

    expect(screen.getByText("Review Order")).toBeInTheDocument();
  });

  it("navigates back to tickets step when Back is clicked", async () => {
    render(<CheckoutFlow {...defaultProps} />);
    const plusButtons = screen.getAllByText("+");
    await userEvent.click(plusButtons[0]);
    await userEvent.click(screen.getByText("Continue"));

    expect(screen.getByText("Review Order")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Back"));
    expect(screen.getByText("Select Tickets")).toBeInTheDocument();
  });

  // ── Details / Review step ──────────────────────────────────────────

  it("shows line items on the review step", async () => {
    render(<CheckoutFlow {...defaultProps} />);
    const plusButtons = screen.getAllByText("+");
    await userEvent.click(plusButtons[0]); // 1x General Admission
    await userEvent.click(screen.getByText("Continue"));

    expect(screen.getByText("1x General Admission")).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("Service Fee")).toBeInTheDocument();
    expect(screen.getByText("Processing Fee")).toBeInTheDocument();
  });

  it("shows promo code input on details step", async () => {
    render(<CheckoutFlow {...defaultProps} />);
    const plusButtons = screen.getAllByText("+");
    await userEvent.click(plusButtons[0]);
    await userEvent.click(screen.getByText("Continue"));

    expect(screen.getByText("Promo Code")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter code")).toBeInTheDocument();
  });

  // ── Promo code ─────────────────────────────────────────────────────

  it("applies promo code on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutFlow {...defaultProps} />);
    const plusButtons = screen.getAllByText("+");
    await userEvent.click(plusButtons[0]);
    await userEvent.click(screen.getByText("Continue"));

    const input = screen.getByPlaceholderText("Enter code");
    await userEvent.type(input, "SAVE10");
    await userEvent.click(screen.getByText("Apply"));

    await waitFor(() => {
      expect(screen.getByText("SAVE10")).toBeInTheDocument();
      expect(screen.getByText("Remove")).toBeInTheDocument();
    });
  });

  it("shows error for invalid promo code", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Invalid promo code" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutFlow {...defaultProps} />);
    const plusButtons = screen.getAllByText("+");
    await userEvent.click(plusButtons[0]);
    await userEvent.click(screen.getByText("Continue"));

    const input = screen.getByPlaceholderText("Enter code");
    await userEvent.type(input, "BADCODE");
    await userEvent.click(screen.getByText("Apply"));

    await waitFor(() => {
      expect(screen.getByText("Invalid promo code")).toBeInTheDocument();
    });
  });

  it("shows error when promo validation fetch fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutFlow {...defaultProps} />);
    const plusButtons = screen.getAllByText("+");
    await userEvent.click(plusButtons[0]);
    await userEvent.click(screen.getByText("Continue"));

    const input = screen.getByPlaceholderText("Enter code");
    await userEvent.type(input, "CODE");
    await userEvent.click(screen.getByText("Apply"));

    await waitFor(() => {
      expect(screen.getByText("Failed to validate promo code")).toBeInTheDocument();
    });
  });

  // ── Checkout / Payment ─────────────────────────────────────────────

  it("shows error when checkout fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Checkout failed" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutFlow {...defaultProps} />);
    const plusButtons = screen.getAllByText("+");
    await userEvent.click(plusButtons[0]);
    await userEvent.click(screen.getByText("Continue"));
    await userEvent.click(screen.getByText("Checkout"));

    await waitFor(() => {
      expect(screen.getByText("Checkout failed")).toBeInTheDocument();
    });
  });

  it("redirects to Stripe URL on successful checkout", async () => {
    const locationMock = { ...window.location, href: "", origin: "http://localhost:3000" };
    vi.stubGlobal("location", locationMock);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/session123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutFlow {...defaultProps} />);
    const plusButtons = screen.getAllByText("+");
    await userEvent.click(plusButtons[0]);
    await userEvent.click(screen.getByText("Continue"));
    await userEvent.click(screen.getByText("Checkout"));

    await waitFor(() => {
      expect(locationMock.href).toBe("https://checkout.stripe.com/session123");
    });
  });

  it("shows confirmation step on direct order completion", async () => {
    const onComplete = vi.fn();
    const confirmation = {
      orderId: "ord-12345678-abcde",
      tickets: [
        {
          id: "tkt-1",
          qrCode: "qr-data",
          eventTitle: "Comedy Night Live",
          venueName: "The Laugh Factory",
          eventDate: "2026-04-15T20:00:00Z",
          showtime: "8:00 PM",
          ticketTypeName: "General Admission",
        },
      ],
      subtotal: 25.0,
      discount: 0,
      serviceFee: 2.5,
      processingFee: 1.03,
      tax: 0,
      total: 28.53,
      customerEmail: "fan@example.com",
      promoCode: null,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(confirmation),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { ...window.location, origin: "http://localhost:3000", href: "" });

    render(<CheckoutFlow {...defaultProps} onComplete={onComplete} />);
    const plusButtons = screen.getAllByText("+");
    await userEvent.click(plusButtons[0]);
    await userEvent.click(screen.getByText("Continue"));
    await userEvent.click(screen.getByText("Checkout"));

    await waitFor(() => {
      expect(screen.getByText("Order Confirmed!")).toBeInTheDocument();
    });
    expect(onComplete).toHaveBeenCalledWith(confirmation);
  });

  it("shows Processing... while checkout is in progress", async () => {
    let resolveCheckout: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveCheckout = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(pendingPromise);
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { ...window.location, origin: "http://localhost:3000", href: "" });

    render(<CheckoutFlow {...defaultProps} />);
    const plusButtons = screen.getAllByText("+");
    await userEvent.click(plusButtons[0]);
    await userEvent.click(screen.getByText("Continue"));
    await userEvent.click(screen.getByText("Checkout"));

    expect(screen.getByText("Processing...")).toBeInTheDocument();

    // Clean up
    resolveCheckout!({
      ok: true,
      json: () => Promise.resolve({ url: "https://stripe.com" }),
    });
  });

  it("shows error when checkout throws a network error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Connection refused"));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { ...window.location, origin: "http://localhost:3000", href: "" });

    render(<CheckoutFlow {...defaultProps} />);
    const plusButtons = screen.getAllByText("+");
    await userEvent.click(plusButtons[0]);
    await userEvent.click(screen.getByText("Continue"));
    await userEvent.click(screen.getByText("Checkout"));

    await waitFor(() => {
      expect(screen.getByText("Connection refused")).toBeInTheDocument();
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────

  it("does not allow adding more tickets than available", async () => {
    const limitedTypes = [
      { id: "tt-1", name: "Limited", price: 10, description: null, available: 2, onSale: true },
    ];
    render(<CheckoutFlow {...defaultProps} ticketTypes={limitedTypes} />);

    const plusBtn = screen.getByText("+");
    await userEvent.click(plusBtn);
    await userEvent.click(plusBtn);

    // The + button should be disabled at max
    expect(plusBtn).toBeDisabled();
  });

  it("shows ticket type that is not on sale", () => {
    const types = [
      { id: "tt-1", name: "Coming Soon", price: 50, description: null, available: 10, onSale: false },
    ];
    render(<CheckoutFlow {...defaultProps} ticketTypes={types} />);
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
    expect(screen.getByText("Not on sale")).toBeInTheDocument();
  });
});
