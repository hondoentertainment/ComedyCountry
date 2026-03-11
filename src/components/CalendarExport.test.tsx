import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CalendarExport } from "./CalendarExport";

const defaultProps = {
  eventId: "event-1",
  title: "Comedy Night",
  date: "2024-06-15T20:00:00Z",
  venue: "The Laugh Factory",
  location: "Los Angeles, CA",
};

describe("CalendarExport", () => {
  it("renders iCal download link", () => {
    render(<CalendarExport {...defaultProps} />);

    const icalLink = screen.getByText("iCal");
    expect(icalLink).toBeInTheDocument();
    expect(icalLink.closest("a")).toHaveAttribute(
      "href",
      "/api/events/event-1/calendar"
    );
  });

  it("renders Google Calendar link", () => {
    render(<CalendarExport {...defaultProps} />);

    const googleLink = screen.getByText("Google Calendar");
    expect(googleLink).toBeInTheDocument();
    const href = googleLink.closest("a")?.getAttribute("href") ?? "";
    expect(href).toContain("https://calendar.google.com/calendar/render");
    expect(href).toContain("Comedy%20Night");
    expect(href).toContain("Los%20Angeles");
  });

  it("Google Calendar link opens in new tab", () => {
    render(<CalendarExport {...defaultProps} />);

    const googleLink = screen.getByText("Google Calendar").closest("a");
    expect(googleLink).toHaveAttribute("target", "_blank");
    expect(googleLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("includes venue in Google Calendar details", () => {
    render(<CalendarExport {...defaultProps} />);

    const href = screen.getByText("Google Calendar").closest("a")?.getAttribute("href") ?? "";
    expect(href).toContain(encodeURIComponent("Comedy Night at The Laugh Factory"));
  });
});
