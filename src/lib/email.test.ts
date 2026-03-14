import { describe, it, expect, vi } from "vitest";
import { sendEmail, digestEmailHtml, eventReminderHtml } from "./email";

describe("sendEmail", () => {
  it("returns true in dev mode (console.log fallback)", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });
    expect(result).toBe(true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[EMAIL]"));
    spy.mockRestore();
  });

  it("handles errors gracefully", async () => {
    // Force an error by mocking console.log to throw
    const spy = vi.spyOn(console, "log").mockImplementation(() => { throw new Error("fail"); });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await sendEmail({ to: "test@example.com", subject: "Test", html: "<p>Hi</p>" });
    expect(result).toBe(false);
    spy.mockRestore();
    errorSpy.mockRestore();
  });
});

describe("digestEmailHtml", () => {
  it("generates HTML with items", () => {
    const html = digestEmailHtml("John", [
      { title: "New Show", message: "Dave at Comedy Club", url: "http://example.com/event/1" },
      { title: "Tour Update", message: "Coming to your city" },
    ]);
    expect(html).toContain("John");
    expect(html).toContain("New Show");
    expect(html).toContain("Dave at Comedy Club");
    expect(html).toContain("Tour Update");
    expect(html).toContain("http://example.com/event/1");
  });
});

describe("eventReminderHtml", () => {
  it("generates HTML with event details", () => {
    const html = eventReminderHtml("Jane", "Dave Chappelle", "The Improv", "Mar 15", "http://example.com/event/1");
    expect(html).toContain("Jane");
    expect(html).toContain("Dave Chappelle");
    expect(html).toContain("The Improv");
    expect(html).toContain("Mar 15");
  });
});
