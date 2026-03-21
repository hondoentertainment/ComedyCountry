import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SeatPicker, { type Seat } from "./SeatPicker";

const defaultSeats: Seat[] = [
  { row: 0, col: 0, type: "standard", label: "A1", price: 25, ticketTypeId: "tt-1" },
  { row: 0, col: 1, type: "standard", label: "A2", price: 25, ticketTypeId: "tt-1" },
  { row: 0, col: 2, type: "premium", label: "A3", price: 50, ticketTypeId: "tt-2" },
  { row: 1, col: 0, type: "vip", label: "B1", price: 100, ticketTypeId: "tt-3" },
  { row: 1, col: 1, type: "accessible", label: "B2", price: 25, ticketTypeId: "tt-1" },
  { row: 1, col: 2, type: "blocked", label: "B3" },
];

const defaultProps = {
  layoutId: "layout-1",
  layoutName: "Main Hall",
  rows: 2,
  columns: 3,
  seats: defaultSeats,
};

describe("SeatPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Basic rendering ────────────────────────────────────────────────

  it("renders the stage indicator", () => {
    render(<SeatPicker {...defaultProps} />);
    expect(screen.getByText("Stage")).toBeInTheDocument();
  });

  it("renders the layout name", () => {
    render(<SeatPicker {...defaultProps} />);
    expect(screen.getByText("Main Hall")).toBeInTheDocument();
  });

  it("renders seat labels", () => {
    render(<SeatPicker {...defaultProps} />);
    expect(screen.getByText("A1")).toBeInTheDocument();
    expect(screen.getByText("A2")).toBeInTheDocument();
    expect(screen.getByText("A3")).toBeInTheDocument();
    expect(screen.getByText("B1")).toBeInTheDocument();
    expect(screen.getByText("B2")).toBeInTheDocument();
  });

  it("renders legend by default", () => {
    render(<SeatPicker {...defaultProps} />);
    expect(screen.getByText("Standard")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.getByText("Accessible")).toBeInTheDocument();
    expect(screen.getByText("Selected")).toBeInTheDocument();
    expect(screen.getByText("Sold")).toBeInTheDocument();
    expect(screen.getByText("Held")).toBeInTheDocument();
  });

  it("hides legend when showLegend is false", () => {
    render(<SeatPicker {...defaultProps} showLegend={false} />);
    expect(screen.queryByText("Standard")).not.toBeInTheDocument();
  });

  it("shows prices on available seats", () => {
    render(<SeatPicker {...defaultProps} />);
    // Multiple seats may have the same price, so use getAllByText
    expect(screen.getAllByText("$25").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$50").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$100").length).toBeGreaterThan(0);
  });

  it("hides prices when showPrices is false", () => {
    render(<SeatPicker {...defaultProps} showPrices={false} />);
    // With showPrices=false the price spans should not appear inside seat buttons
    const allButtons = screen.getAllByRole("button");
    const seatA3 = allButtons.find((btn) =>
      btn.getAttribute("aria-label")?.includes("A3")
    );
    expect(seatA3?.textContent).not.toContain("$50");
  });

  it("shows max selectable info", () => {
    render(<SeatPicker {...defaultProps} maxSelectable={4} />);
    expect(screen.getByText("Max 4 seats per order")).toBeInTheDocument();
  });

  // ── Seat selection ─────────────────────────────────────────────────

  it("selects a seat on click", async () => {
    const onSelectionChange = vi.fn();
    render(
      <SeatPicker {...defaultProps} onSelectionChange={onSelectionChange} />
    );

    const seatA1 = screen.getByRole("button", {
      name: /Seat A1/,
    });
    await userEvent.click(seatA1);

    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ label: "A1", row: 0, col: 0 }),
      ])
    );
  });

  it("deselects a seat on second click", async () => {
    const onSelectionChange = vi.fn();
    render(
      <SeatPicker {...defaultProps} onSelectionChange={onSelectionChange} />
    );

    const seatA1 = screen.getByRole("button", { name: /Seat A1/ });
    await userEvent.click(seatA1);
    await userEvent.click(seatA1);

    // Last call should have empty array
    const lastCall = onSelectionChange.mock.calls.at(-1);
    expect(lastCall![0]).toHaveLength(0);
  });

  it("allows selecting multiple seats", async () => {
    const onSelectionChange = vi.fn();
    render(
      <SeatPicker {...defaultProps} onSelectionChange={onSelectionChange} />
    );

    await userEvent.click(screen.getByRole("button", { name: /Seat A1/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seat A3/ }));

    const lastCall = onSelectionChange.mock.calls.at(-1);
    expect(lastCall![0]).toHaveLength(2);
  });

  it("shows selection summary with total price", async () => {
    render(<SeatPicker {...defaultProps} />);

    await userEvent.click(screen.getByRole("button", { name: /Seat A1/ }));

    expect(screen.getByText("1 Seat Selected")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();
  });

  it("shows plural 'Seats' when multiple selected", async () => {
    render(<SeatPicker {...defaultProps} />);

    await userEvent.click(screen.getByRole("button", { name: /Seat A1/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seat A3/ }));

    expect(screen.getByText("2 Seats Selected")).toBeInTheDocument();
    expect(screen.getByText("$75.00")).toBeInTheDocument();
  });

  it("enforces maxSelectable limit", async () => {
    const onSelectionChange = vi.fn();
    render(
      <SeatPicker
        {...defaultProps}
        maxSelectable={2}
        onSelectionChange={onSelectionChange}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /Seat A1/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seat A2/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seat A3/ }));

    // Should still only have 2 selected
    const lastCall = onSelectionChange.mock.calls.at(-1);
    expect(lastCall![0]).toHaveLength(2);
  });

  // ── Sold / Held / Blocked seats ────────────────────────────────────

  it("disables sold seats", () => {
    render(<SeatPicker {...defaultProps} soldSeats={["0-0"]} />);
    const seatA1 = screen.getByRole("button", { name: /Seat A1/ });
    expect(seatA1).toBeDisabled();
  });

  it("disables held seats", () => {
    render(<SeatPicker {...defaultProps} heldSeats={["0-1"]} />);
    const seatA2 = screen.getByRole("button", { name: /Seat A2/ });
    expect(seatA2).toBeDisabled();
  });

  it("disables blocked type seats", () => {
    render(<SeatPicker {...defaultProps} />);
    const seatB3 = screen.getByRole("button", { name: /Seat B3/ });
    expect(seatB3).toBeDisabled();
  });

  it("does not select sold seats on click", async () => {
    const onSelectionChange = vi.fn();
    render(
      <SeatPicker
        {...defaultProps}
        soldSeats={["0-0"]}
        onSelectionChange={onSelectionChange}
      />
    );

    const seatA1 = screen.getByRole("button", { name: /Seat A1/ });
    await userEvent.click(seatA1);

    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  // ── Clear and Checkout ─────────────────────────────────────────────

  it("clears selection when Clear button is clicked", async () => {
    const onSelectionChange = vi.fn();
    render(
      <SeatPicker {...defaultProps} onSelectionChange={onSelectionChange} />
    );

    await userEvent.click(screen.getByRole("button", { name: /Seat A1/ }));
    expect(screen.getByText("1 Seat Selected")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Clear"));

    // Selection summary should disappear
    expect(screen.queryByText("1 Seat Selected")).not.toBeInTheDocument();
    // onSelectionChange called with empty array for clear
    const lastCall = onSelectionChange.mock.calls.at(-1);
    expect(lastCall![0]).toHaveLength(0);
  });

  it("calls onCheckout with selected seats", async () => {
    const onCheckout = vi.fn();
    render(<SeatPicker {...defaultProps} onCheckout={onCheckout} />);

    await userEvent.click(screen.getByRole("button", { name: /Seat A1/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seat B1/ }));

    const checkoutBtn = screen.getByText(/Checkout/);
    await userEvent.click(checkoutBtn);

    expect(onCheckout).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ label: "A1" }),
        expect.objectContaining({ label: "B1" }),
      ])
    );
  });

  it("removes a seat from selection via the × button", async () => {
    render(<SeatPicker {...defaultProps} />);

    await userEvent.click(screen.getByRole("button", { name: /Seat A1/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seat A2/ }));

    expect(screen.getByText("2 Seats Selected")).toBeInTheDocument();

    // Click the remove button for seat A1
    const removeBtn = screen.getByRole("button", { name: "Remove seat A1" });
    await userEvent.click(removeBtn);

    expect(screen.getByText("1 Seat Selected")).toBeInTheDocument();
  });

  // ── Currency ───────────────────────────────────────────────────────

  it("uses custom currency symbol", async () => {
    render(<SeatPicker {...defaultProps} currency="€" />);

    await userEvent.click(screen.getByRole("button", { name: /Seat A1/ }));

    expect(screen.getByText("€25.00")).toBeInTheDocument();
  });
});
