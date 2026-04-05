import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pagination } from "./Pagination";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("Pagination", () => {
  it("returns null when totalPages <= 1", () => {
    const { container } = render(
      <Pagination total={10} currentPage={1} basePath="/events" searchParams={{}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when total is 0 (ceil gives 1)", () => {
    const { container } = render(
      <Pagination total={0} currentPage={1} basePath="/events" searchParams={{}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders pagination when multiple pages", () => {
    render(
      <Pagination
        total={50}
        currentPage={1}
        basePath="/events"
        searchParams={{}}
      />
    );
    const nav = screen.getByRole("navigation");
    expect(nav).toHaveTextContent("Showing 1–20 of 50");
    expect(nav).toHaveTextContent("Page 1 of 3");
    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("disables Previous on first page", () => {
    render(
      <Pagination
        total={50}
        currentPage={1}
        basePath="/events"
        searchParams={{}}
      />
    );
    const prevButton = screen.getByText("Previous").closest("button");
    expect(prevButton).toBeDisabled();
    expect(prevButton).toHaveAttribute("aria-disabled", "true");
  });

  it("disables Next on last page", () => {
    render(
      <Pagination
        total={50}
        currentPage={3}
        basePath="/events"
        searchParams={{}}
      />
    );
    const nextButton = screen.getByText("Next").closest("button");
    expect(nextButton).toBeDisabled();
    expect(nextButton).toHaveAttribute("aria-disabled", "true");
  });

  it("builds correct URLs with search params", () => {
    render(
      <Pagination
        total={50}
        currentPage={2}
        basePath="/comedians"
        searchParams={{ search: "chappelle", state: "CA" }}
      />
    );
    const nextLink = screen.getByRole("link", { name: "Next" });
    expect(nextLink).toHaveAttribute(
      "href",
      "/comedians?search=chappelle&state=CA&page=3"
    );
  });

  it("omits page param when page is 1", () => {
    render(
      <Pagination
        total={50}
        currentPage={2}
        basePath="/events"
        searchParams={{ city: "LA" }}
      />
    );
    const prevLink = screen.getByRole("link", { name: "Previous" });
    expect(prevLink).toHaveAttribute("href", "/events?city=LA");
  });

  it("calculates correct start/end for middle page", () => {
    render(
      <Pagination
        total={100}
        currentPage={3}
        basePath="/events"
        searchParams={{}}
      />
    );
    expect(screen.getByRole("navigation")).toHaveTextContent("Showing 41–60 of 100");
  });

  it("shows correct end on last page with partial results", () => {
    render(
      <Pagination
        total={45}
        currentPage={3}
        basePath="/events"
        searchParams={{}}
      />
    );
    expect(screen.getByRole("navigation")).toHaveTextContent("Showing 41–45 of 45");
  });

  it("enables both Previous and Next on middle page", () => {
    render(
      <Pagination
        total={100}
        currentPage={3}
        basePath="/events"
        searchParams={{}}
      />
    );

    const prevLink = screen.getByRole("link", { name: "Previous" });
    const nextLink = screen.getByRole("link", { name: "Next" });
    expect(prevLink).toBeInTheDocument();
    expect(nextLink).toBeInTheDocument();
  });

  it("excludes empty search params from URL", () => {
    render(
      <Pagination
        total={50}
        currentPage={1}
        basePath="/events"
        searchParams={{ search: "", city: undefined }}
      />
    );
    const nextLink = screen.getByRole("link", { name: "Next" });
    expect(nextLink).toHaveAttribute("href", "/events?page=2");
  });

  it("builds URL without query string when no params and page 1", () => {
    render(
      <Pagination
        total={50}
        currentPage={2}
        basePath="/events"
        searchParams={{}}
      />
    );
    const prevLink = screen.getByRole("link", { name: "Previous" });
    expect(prevLink).toHaveAttribute("href", "/events");
  });

  it("has Pagination aria-label on nav", () => {
    render(
      <Pagination
        total={50}
        currentPage={1}
        basePath="/events"
        searchParams={{}}
      />
    );
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
  });

  it("shows Page X of Y text", () => {
    render(
      <Pagination
        total={100}
        currentPage={2}
        basePath="/events"
        searchParams={{}}
      />
    );
    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();
  });
});
