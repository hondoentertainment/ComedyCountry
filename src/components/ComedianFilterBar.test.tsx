import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComedianFilterBar } from "./ComedianFilterBar";

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
  TOURING_STATUS_LABELS: {
    TOURING: "Touring",
    REGIONAL: "Regional",
    LOCAL: "Local",
    RETIRED: "Retired",
    UNKNOWN: "Unknown",
  },
}));

describe("ComedianFilterBar", () => {
  const defaultProps = {
    genres: ["Observational", "Dark", "Political"],
  };

  it("renders a form element", () => {
    const { container } = render(<ComedianFilterBar {...defaultProps} />);
    const form = container.querySelector("form");
    expect(form).toBeInTheDocument();
    expect(form).toHaveAttribute("method", "get");
  });

  it("renders search autocomplete input", () => {
    render(<ComedianFilterBar {...defaultProps} />);
    expect(screen.getByTestId("search-autocomplete")).toBeInTheDocument();
  });

  it("renders touring status select with all options", () => {
    render(<ComedianFilterBar {...defaultProps} />);
    const select = screen.getByLabelText("Touring status");
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe("SELECT");

    const options = select.querySelectorAll("option");
    // "All statuses" + 5 statuses
    expect(options).toHaveLength(6);
    expect(options[0]).toHaveTextContent("All statuses");
    expect(options[1]).toHaveTextContent("Touring");
    expect(options[2]).toHaveTextContent("Regional");
  });

  it("renders genre select with provided genres", () => {
    render(<ComedianFilterBar {...defaultProps} />);
    const select = screen.getByLabelText("Genre");
    expect(select).toBeInTheDocument();

    const options = select.querySelectorAll("option");
    // "All genres" + 3 genres
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveTextContent("All genres");
    expect(options[1]).toHaveTextContent("Observational");
    expect(options[2]).toHaveTextContent("Dark");
    expect(options[3]).toHaveTextContent("Political");
  });

  it("renders filter submit button", () => {
    render(<ComedianFilterBar {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
  });

  it("sets default status value when provided", () => {
    render(<ComedianFilterBar {...defaultProps} defaultStatus="TOURING" />);
    const select = screen.getByLabelText("Touring status") as HTMLSelectElement;
    expect(select.value).toBe("TOURING");
  });

  it("sets default genre value when provided", () => {
    render(<ComedianFilterBar {...defaultProps} defaultGenre="Dark" />);
    const select = screen.getByLabelText("Genre") as HTMLSelectElement;
    expect(select.value).toBe("Dark");
  });

  it("sets default search value when provided", () => {
    render(<ComedianFilterBar {...defaultProps} defaultSearch="dave" />);
    const input = screen.getByTestId("search-autocomplete") as HTMLInputElement;
    expect(input.defaultValue).toBe("dave");
  });

  it("capitalizes first letter of genre options", () => {
    render(
      <ComedianFilterBar genres={["observational", "dark"]} />
    );
    const select = screen.getByLabelText("Genre");
    const options = select.querySelectorAll("option");
    expect(options[1]).toHaveTextContent("Observational");
    expect(options[2]).toHaveTextContent("Dark");
  });

  it("renders with empty genres array", () => {
    render(<ComedianFilterBar genres={[]} />);
    const select = screen.getByLabelText("Genre");
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(1); // Just "All genres"
  });
});
