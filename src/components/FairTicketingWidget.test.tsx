import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import FairTicketingWidget from "./FairTicketingWidget";

function mockFetch(responses: Record<string, { ok: boolean; data: unknown }>) {
  return vi.fn((url: string) => {
    for (const [pattern, response] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return Promise.resolve({
          ok: response.ok,
          json: () => Promise.resolve(response.data),
        });
      }
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
  });
}

describe("FairTicketingWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<FairTicketingWidget eventId="e1" ticketTypeId="tt1" />);
    // Loading skeleton has animated pulse divs
    const container = document.querySelector(".animate-pulse");
    expect(container).toBeInTheDocument();
  });

  it("renders transparent price breakdown when fees shown", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/api/fair-ticketing/price": {
          ok: true,
          data: {
            ticketTypeName: "General Admission",
            basePrice: 50,
            serviceFee: 5,
            processingFee: 1.75,
            totalPrice: 56.75,
            feePercentage: 13.5,
            showAllFees: true,
            antiScalpingEnabled: true,
          },
        },
        "/api/fair-ticketing/waitlist": { ok: false, data: null },
        "/api/fair-ticketing/resale": { ok: true, data: [] },
      })
    );

    render(<FairTicketingWidget eventId="e1" ticketTypeId="tt1" />);

    await waitFor(() => {
      expect(screen.getByText("Transparent Price Breakdown")).toBeInTheDocument();
    });

    expect(screen.getByText("$50.00")).toBeInTheDocument();
    expect(screen.getByText("$5.00")).toBeInTheDocument();
    expect(screen.getByText("$1.75")).toBeInTheDocument();
    expect(screen.getByText("$56.75")).toBeInTheDocument();
    expect(screen.getByText("General Admission (Base Price)")).toBeInTheDocument();
  });

  it("renders anti-scalping badge when enabled", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/api/fair-ticketing/price": {
          ok: true,
          data: {
            ticketTypeName: "GA",
            basePrice: 50,
            serviceFee: 5,
            processingFee: 1.75,
            totalPrice: 56.75,
            feePercentage: 13.5,
            showAllFees: true,
            antiScalpingEnabled: true,
          },
        },
        "/api/fair-ticketing/waitlist": { ok: false, data: null },
        "/api/fair-ticketing/resale": { ok: true, data: [] },
      })
    );

    render(<FairTicketingWidget eventId="e1" ticketTypeId="tt1" />);

    await waitFor(() => {
      expect(screen.getByText("Anti-Scalping Protected")).toBeInTheDocument();
    });
  });

  it("does not render anti-scalping badge when disabled", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/api/fair-ticketing/price": {
          ok: true,
          data: {
            ticketTypeName: "GA",
            basePrice: 50,
            serviceFee: 5,
            processingFee: 1.75,
            totalPrice: 56.75,
            feePercentage: 13.5,
            showAllFees: true,
            antiScalpingEnabled: false,
          },
        },
        "/api/fair-ticketing/waitlist": { ok: false, data: null },
        "/api/fair-ticketing/resale": { ok: true, data: [] },
      })
    );

    render(<FairTicketingWidget eventId="e1" ticketTypeId="tt1" />);

    await waitFor(() => {
      expect(screen.getByText("Transparent Price Breakdown")).toBeInTheDocument();
    });
    expect(screen.queryByText("Anti-Scalping Protected")).not.toBeInTheDocument();
  });

  it("renders waitlist position when user is in waitlist", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/api/fair-ticketing/price": { ok: false, data: null },
        "/api/fair-ticketing/waitlist": {
          ok: true,
          data: {
            position: 5,
            effectivePosition: 3,
            status: "WAITING",
            joinedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          },
        },
        "/api/fair-ticketing/resale": { ok: true, data: [] },
      })
    );

    render(<FairTicketingWidget eventId="e1" />);

    await waitFor(() => {
      expect(screen.getByText("#3")).toBeInTheDocument();
    });
    expect(screen.getByText("in line")).toBeInTheDocument();
    expect(screen.getByText("WAITING")).toBeInTheDocument();
  });

  it("renders OFFERED status with gold styling", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/api/fair-ticketing/price": { ok: false, data: null },
        "/api/fair-ticketing/waitlist": {
          ok: true,
          data: {
            position: 1,
            effectivePosition: 1,
            status: "OFFERED",
            joinedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          },
        },
        "/api/fair-ticketing/resale": { ok: true, data: [] },
      })
    );

    render(<FairTicketingWidget eventId="e1" />);

    await waitFor(() => {
      expect(screen.getByText("OFFERED")).toBeInTheDocument();
    });
  });

  it("renders resale listings when available", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/api/fair-ticketing/price": { ok: false, data: null },
        "/api/fair-ticketing/waitlist": { ok: false, data: null },
        "/api/fair-ticketing/resale": {
          ok: true,
          data: [
            {
              id: "rl1",
              maxPrice: 55,
              ticket: { ticketType: { name: "VIP" } },
            },
            {
              id: "rl2",
              maxPrice: 60,
              ticket: { ticketType: { name: "General Admission" } },
            },
          ],
        },
      })
    );

    render(<FairTicketingWidget eventId="e1" />);

    await waitFor(() => {
      expect(screen.getByText("Verified Resale Tickets")).toBeInTheDocument();
    });
    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.getByText("General Admission")).toBeInTheDocument();
    expect(screen.getByText("$55.00")).toBeInTheDocument();
    expect(screen.getByText("$60.00")).toBeInTheDocument();
  });

  it("does not render resale section when no listings", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/api/fair-ticketing/price": { ok: false, data: null },
        "/api/fair-ticketing/waitlist": { ok: false, data: null },
        "/api/fair-ticketing/resale": { ok: true, data: [] },
      })
    );

    render(<FairTicketingWidget eventId="e1" />);

    await waitFor(() => {
      expect(screen.getByText("Fair Ticketing")).toBeInTheDocument();
    });
    expect(screen.queryByText("Verified Resale Tickets")).not.toBeInTheDocument();
  });

  it("renders no-hidden-fees notice", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/api/fair-ticketing/price": { ok: false, data: null },
        "/api/fair-ticketing/waitlist": { ok: false, data: null },
        "/api/fair-ticketing/resale": { ok: true, data: [] },
      })
    );

    render(<FairTicketingWidget eventId="e1" />);

    await waitFor(() => {
      expect(
        screen.getByText("All prices shown include all fees. No surprises at checkout.")
      ).toBeInTheDocument();
    });
  });

  it("handles fetch errors gracefully without crashing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    render(<FairTicketingWidget eventId="e1" ticketTypeId="tt1" />);

    await waitFor(() => {
      expect(screen.getByText("Fair Ticketing")).toBeInTheDocument();
    });
    // Should render without crashing, just no data sections
    expect(screen.queryByText("Transparent Price Breakdown")).not.toBeInTheDocument();
  });

  it("renders header title", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/api/fair-ticketing/price": { ok: false, data: null },
        "/api/fair-ticketing/waitlist": { ok: false, data: null },
        "/api/fair-ticketing/resale": { ok: true, data: [] },
      })
    );

    render(<FairTicketingWidget eventId="e1" />);

    await waitFor(() => {
      expect(screen.getByText("Fair Ticketing")).toBeInTheDocument();
    });
  });

  it("shows fee percentage in breakdown", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/api/fair-ticketing/price": {
          ok: true,
          data: {
            ticketTypeName: "GA",
            basePrice: 100,
            serviceFee: 10,
            processingFee: 3.2,
            totalPrice: 113.2,
            feePercentage: 13.2,
            showAllFees: true,
            antiScalpingEnabled: false,
          },
        },
        "/api/fair-ticketing/waitlist": { ok: false, data: null },
        "/api/fair-ticketing/resale": { ok: true, data: [] },
      })
    );

    render(<FairTicketingWidget eventId="e1" ticketTypeId="tt1" />);

    await waitFor(() => {
      expect(
        screen.getByText("Fees are 13.2% of base price")
      ).toBeInTheDocument();
    });
  });

  it("does not render price breakdown when showAllFees is false", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/api/fair-ticketing/price": {
          ok: true,
          data: {
            ticketTypeName: "GA",
            basePrice: 50,
            serviceFee: 5,
            processingFee: 1.75,
            totalPrice: 56.75,
            feePercentage: 13.5,
            showAllFees: false,
            antiScalpingEnabled: false,
          },
        },
        "/api/fair-ticketing/waitlist": { ok: false, data: null },
        "/api/fair-ticketing/resale": { ok: true, data: [] },
      })
    );

    render(<FairTicketingWidget eventId="e1" ticketTypeId="tt1" />);

    await waitFor(() => {
      expect(screen.getByText("Fair Ticketing")).toBeInTheDocument();
    });
    expect(screen.queryByText("Transparent Price Breakdown")).not.toBeInTheDocument();
  });

  it("shows max price indicator on resale listings", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/api/fair-ticketing/price": { ok: false, data: null },
        "/api/fair-ticketing/waitlist": { ok: false, data: null },
        "/api/fair-ticketing/resale": {
          ok: true,
          data: [
            {
              id: "rl1",
              maxPrice: 75,
              ticket: { ticketType: { name: "Front Row" } },
            },
          ],
        },
      })
    );

    render(<FairTicketingWidget eventId="e1" />);

    await waitFor(() => {
      expect(screen.getByText("$75.00")).toBeInTheDocument();
    });
    // Each resale listing shows "max price" label
    expect(screen.getByText("max price")).toBeInTheDocument();
    expect(
      screen.getByText("Controlled resale — max price enforced")
    ).toBeInTheDocument();
  });
});
