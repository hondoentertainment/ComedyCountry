import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventRatingForm } from "./EventRatingForm";

vi.mock("./Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("EventRatingForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with initial empty state", () => {
    render(<EventRatingForm eventId="event-1" />);
    expect(screen.getByRole("group", { name: "Rate this show" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Share your experience...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit review" })).toBeInTheDocument();
  });

  it("renders with initial review data", () => {
    render(
      <EventRatingForm
        eventId="event-1"
        initialReview={{
          id: "rev-1",
          rating: 4,
          comment: "Great show!",
        }}
      />
    );
    const textarea = screen.getByPlaceholderText("Share your experience...");
    expect(textarea).toHaveValue("Great show!");
    expect(screen.getByRole("button", { name: "Rate 4 out of 5" })).toBeInTheDocument();
  });

  it("disables submit when no rating and no comment", () => {
    render(<EventRatingForm eventId="event-1" />);
    const submitBtn = screen.getByRole("button", { name: "Submit review" });
    expect(submitBtn).toBeDisabled();
  });

  it("enables submit when rating is selected", async () => {
    render(<EventRatingForm eventId="event-1" />);
    await userEvent.click(screen.getByRole("button", { name: "Rate 4 out of 5" }));
    const submitBtn = screen.getByRole("button", { name: "Submit review" });
    expect(submitBtn).not.toBeDisabled();
  });

  it("enables submit when comment is entered", async () => {
    render(<EventRatingForm eventId="event-1" />);
    await userEvent.type(
      screen.getByPlaceholderText("Share your experience..."),
      "Had a blast"
    );
    const submitBtn = screen.getByRole("button", { name: "Submit review" });
    expect(submitBtn).not.toBeDisabled();
  });

  it("submits rating and comment on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    vi.stubGlobal("fetch", fetchMock);

    const onSuccess = vi.fn();

    render(
      <EventRatingForm
        eventId="event-123"
        onSuccess={onSuccess}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Rate 5 out of 5" }));
    await userEvent.type(
      screen.getByPlaceholderText("Share your experience..."),
      "Amazing!"
    );
    await userEvent.click(screen.getByRole("button", { name: "Submit review" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/events/event-123/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.stringContaining('"rating":5'),
    });
    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.rating).toBe(5);
    expect(callBody.comment).toBe("Amazing!");
    expect(onSuccess).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Saved/i })).toBeInTheDocument();
  });

  it("shows error on API failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Failed to save" }),
    }));

    render(<EventRatingForm eventId="event-1" />);

    await userEvent.click(screen.getByRole("button", { name: "Rate 3 out of 5" }));
    await userEvent.click(screen.getByRole("button", { name: "Submit review" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to save");
  });

  it("redirects to sign-in with callbackUrl on 401", async () => {
    const locationMock = { href: "", pathname: "/events/event-1" };
    vi.stubGlobal("location", locationMock);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }));

    render(
      <EventRatingForm
        eventId="event-1"
        signInUrl="/auth/signin"
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Rate 2 out of 5" }));
    await userEvent.click(screen.getByRole("button", { name: "Submit review" }));

    expect(locationMock.href).toMatch(/^\/auth\/signin\?callbackUrl=/);
    expect(locationMock.href).toContain(encodeURIComponent("/events/event-1"));
  });
});
