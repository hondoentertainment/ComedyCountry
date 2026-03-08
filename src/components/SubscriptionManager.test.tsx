import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubscriptionManager } from "./SubscriptionManager";

describe("SubscriptionManager", () => {
  it("shows free plan when no subscription", () => {
    render(
      <SubscriptionManager
        currentPlan={null}
        status={null}
        periodEnd={null}
        cancelAtPeriodEnd={false}
      />
    );
    expect(screen.getByText("Free Plan")).toBeInTheDocument();
    expect(screen.getByText("View plans")).toBeInTheDocument();
  });

  it("shows active subscription details", () => {
    render(
      <SubscriptionManager
        currentPlan="FAN_PRO"
        status="ACTIVE"
        periodEnd="2026-04-01T00:00:00.000Z"
        cancelAtPeriodEnd={false}
      />
    );
    expect(screen.getByText("Fan Pro")).toBeInTheDocument();
    expect(screen.getByText("$4.99/mo")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText(/Next billing date/)).toBeInTheDocument();
  });

  it("shows comedian pro plan label", () => {
    render(
      <SubscriptionManager
        currentPlan="COMEDIAN_PRO"
        status="ACTIVE"
        periodEnd="2026-04-01T00:00:00.000Z"
        cancelAtPeriodEnd={false}
      />
    );
    expect(screen.getByText("Comedian Pro")).toBeInTheDocument();
    expect(screen.getByText("$14.99/mo")).toBeInTheDocument();
  });

  it("shows cancel notice when cancelAtPeriodEnd is true", () => {
    render(
      <SubscriptionManager
        currentPlan="FAN_PRO"
        status="ACTIVE"
        periodEnd="2026-04-01T00:00:00.000Z"
        cancelAtPeriodEnd={true}
      />
    );
    expect(screen.getByText(/Cancels on/)).toBeInTheDocument();
    expect(screen.queryByText("Cancel subscription")).not.toBeInTheDocument();
  });

  it("shows cancel button when not canceling", () => {
    render(
      <SubscriptionManager
        currentPlan="FAN_PRO"
        status="ACTIVE"
        periodEnd="2026-04-01T00:00:00.000Z"
        cancelAtPeriodEnd={false}
      />
    );
    expect(screen.getByText("Cancel subscription")).toBeInTheDocument();
  });

  it("shows free plan for inactive subscription", () => {
    render(
      <SubscriptionManager
        currentPlan="FAN_PRO"
        status="CANCELED"
        periodEnd={null}
        cancelAtPeriodEnd={false}
      />
    );
    expect(screen.getByText("Free Plan")).toBeInTheDocument();
  });
});
