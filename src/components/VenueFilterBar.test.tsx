import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VenueFilterBar } from "./VenueFilterBar";

vi.mock("./SearchAutocomplete", () => ({
  SearchAutocomplete: ({
    name,
    placeholder,
    defaultValue,
  }: {
    name: string;
    placeholder: string;
    defaultValue?: string;
  }) => (
    <input
      name={name}
      placeholder={placeholder}
      defaultValue={defaultValue}
      data-testid="search-autocomplete"
    />
  ),
}));

vi.mock("@/lib/constants", () => ({
  VENUE_TYPE_LABELS: {
    CLUB: "Club",
    THEATER: "Theater",
    BAR: "Bar",
    FESTIVAL: "Festival",
    OPEN_MIC: "Open Mic",
  },
}));

describe("VenueFilterBar", () => {
  const defaultProps = {
    states: [{ state: "CA" }, { state: "NY" }, { state: "TN" }],
  };

  it("renders a form element with get method", () => {
    const { container } = render(<VenueFilterBar {...defaultProps} />);
    const form = container.querySelector("form");
    expect(form).toBeInTheDocument();
    expect(form).toHaveAttribute("method", "get");
  });

  it("renders search autocomplete", () => {
    render(<VenueFilterBar {...defaultProps} />);
    expect(screen.getByTestId("search-autocomplete")).toBeInTheDocument();
  });

  it("renders state select with all state options", () => {
    render(<VenueFilterBar {...defaultProps} />);
    const select = screen.getByLabelText("State");
    expect(select).toBeInTheDocument();

    const options = select.querySelectorAll("option");
    // "All states" + 3 states
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveTextContent("All states");
    expect(options[1]).toHaveTextContent("CA");
    expect(options[2]).toHaveTextContent("NY");
    expect(options[3]).toHaveTextContent("TN");
  });

  it("renders city text input", () => {
    render(<VenueFilterBar {...defaultProps} />);
    const cityInput = screen.getByLabelText("City");
    expect(cityInput).toBeInTheDocument();
    expect(cityInput).toHaveAttribute("type", "text");
    expect(cityInput).toHaveAttribute("placeholder", "City");
  });

  it("renders type select with venue type options", () => {
    render(<VenueFilterBar {...defaultProps} />);
    const select = screen.getByLabelText("Type");
    expect(select).toBeInTheDocument();

    const options = select.querySelectorAll("option");
    // "All types" + 5 types
    expect(options).toHaveLength(6);
    expect(options[0]).toHaveTextContent("All types");
    expect(options[1]).toHaveTextContent("Club");
    expect(options[2]).toHaveTextContent("Theater");
  });

  it("renders filter button", () => {
    render(<VenueFilterBar {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
  });

  it("sets default state value when provided", () => {
    render(<VenueFilterBar {...defaultProps} defaultState="NY" />);
    const select = screen.getByLabelText("State") as HTMLSelectElement;
    expect(select.value).toBe("NY");
  });

  it("sets default city value when provided", () => {
    render(<VenueFilterBar {...defaultProps} defaultCity="Nashville" />);
    const cityInput = screen.getByLabelText("City") as HTMLInputElement;
    expect(cityInput.defaultValue).toBe("Nashville");
  });

  it("sets default type value when provided", () => {
    render(<VenueFilterBar {...defaultProps} defaultType="THEATER" />);
    const select = screen.getByLabelText("Type") as HTMLSelectElement;
    expect(select.value).toBe("THEATER");
  });

  it("sets default search value when provided", () => {
    render(<VenueFilterBar {...defaultProps} defaultSearch="comedy" />);
    const input = screen.getByTestId("search-autocomplete") as HTMLInputElement;
    expect(input.defaultValue).toBe("comedy");
  });

  it("renders with empty states array", () => {
    render(<VenueFilterBar states={[]} />);
    const select = screen.getByLabelText("State");
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(1); // Just "All states"
  });

  it("has accessible labels for all form fields", () => {
    render(<VenueFilterBar {...defaultProps} />);
    expect(screen.getByLabelText("State")).toBeInTheDocument();
    expect(screen.getByLabelText("City")).toBeInTheDocument();
    expect(screen.getByLabelText("Type")).toBeInTheDocument();
  });
});
