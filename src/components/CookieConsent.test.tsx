import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CookieConsentProvider,
  CookieBanner,
  useCookieConsent,
} from "./CookieConsent";

describe("CookieConsentProvider / useCookieConsent", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("provides default values when used outside provider", () => {
    function TestConsumer() {
      const { consent, hasConsented, accept, reject } = useCookieConsent();
      return (
        <div>
          <span data-testid="consent">{String(consent)}</span>
          <span data-testid="hasConsented">{String(hasConsented)}</span>
          <button onClick={accept}>Accept</button>
          <button onClick={reject}>Reject</button>
        </div>
      );
    }
    render(<TestConsumer />);
    expect(screen.getByTestId("consent")).toHaveTextContent("null");
    expect(screen.getByTestId("hasConsented")).toHaveTextContent("false");
  });

  it("persists accept to localStorage", async () => {
    function TestConsumer() {
      const { accept } = useCookieConsent();
      return <button onClick={accept}>Accept</button>;
    }
    render(
      <CookieConsentProvider>
        <TestConsumer />
      </CookieConsentProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(localStorage.getItem("punchline-atlas-cookie-consent")).toBe("accepted");
  });

  it("persists reject to localStorage", async () => {
    function TestConsumer() {
      const { reject } = useCookieConsent();
      return <button onClick={reject}>Reject</button>;
    }
    render(
      <CookieConsentProvider>
        <TestConsumer />
      </CookieConsentProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(localStorage.getItem("punchline-atlas-cookie-consent")).toBe("rejected");
  });

  it("hasConsented is true after accept", async () => {
    function TestConsumer() {
      const { hasConsented, accept } = useCookieConsent();
      return (
        <div>
          <span data-testid="hasConsented">{String(hasConsented)}</span>
          <button onClick={accept}>Accept</button>
        </div>
      );
    }
    render(
      <CookieConsentProvider>
        <TestConsumer />
      </CookieConsentProvider>
    );

    expect(screen.getByTestId("hasConsented")).toHaveTextContent("false");
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(screen.getByTestId("hasConsented")).toHaveTextContent("true");
  });
});

describe("CookieBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("does not render when consent is already given", () => {
    localStorage.setItem("punchline-atlas-cookie-consent", "accepted");
    render(
      <CookieConsentProvider>
        <CookieBanner />
      </CookieConsentProvider>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not render when consent is rejected", () => {
    localStorage.setItem("punchline-atlas-cookie-consent", "rejected");
    render(
      <CookieConsentProvider>
        <CookieBanner />
      </CookieConsentProvider>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders when no consent stored", async () => {
    render(
      <CookieConsentProvider>
        <CookieBanner />
      </CookieConsentProvider>
    );
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Cookie consent" })).toBeInTheDocument();
    });
  });

  it("has Accept all and Essential only buttons", async () => {
    render(
      <CookieConsentProvider>
        <CookieBanner />
      </CookieConsentProvider>
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Accept all" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Essential only" })).toBeInTheDocument();
    });
  });

  it("dismisses banner when Accept all clicked", async () => {
    render(
      <CookieConsentProvider>
        <CookieBanner />
      </CookieConsentProvider>
    );
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Accept all" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem("punchline-atlas-cookie-consent")).toBe("accepted");
  });

  it("dismisses banner when Essential only clicked", async () => {
    render(
      <CookieConsentProvider>
        <CookieBanner />
      </CookieConsentProvider>
    );
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Essential only" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem("punchline-atlas-cookie-consent")).toBe("rejected");
  });
});
