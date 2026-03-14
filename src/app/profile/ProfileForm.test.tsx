import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileForm } from "./ProfileForm";

const mockToast = vi.fn();

vi.mock("@/components/Toast", () => ({
  useToast: vi.fn(() => ({ toast: mockToast })),
}));

describe("ProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("on successful save, toast is called with 'Profile updated.'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    render(
      <ProfileForm userId="user-1" initialName="Jane Doe" />
    );

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Profile updated.");
    });
  });
});
