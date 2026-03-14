import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsActions } from "./SettingsActions";

const mockToast = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/components/Toast", () => ({
  useToast: vi.fn(() => ({ toast: mockToast })),
}));

vi.mock("next-auth/react", () => ({
  signOut: (opts?: { callbackUrl?: string }) => {
    mockSignOut(opts);
    return Promise.resolve();
  },
}));

vi.mock("@/hooks/useFocusTrap", () => ({
  useFocusTrap: () => ({ current: null }),
}));

describe("SettingsActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("location", { href: "", pathname: "/settings" });
  });

  it("Delete account opens modal with 'This cannot be undone'", async () => {
    render(<SettingsActions />);

    await userEvent.type(
      screen.getByPlaceholderText("DELETE"),
      "DELETE"
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));

    const modal = screen.getByRole("dialog");
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent("This cannot be undone");
  });

  it("Cancel closes the modal", async () => {
    render(<SettingsActions />);

    await userEvent.type(
      screen.getByPlaceholderText("DELETE"),
      "DELETE"
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Confirm Delete calls handleDelete", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<SettingsActions />);

    await userEvent.type(
      screen.getByPlaceholderText("DELETE"),
      "DELETE"
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));

    await userEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/user/delete", {
      method: "DELETE",
    });
  });
});
