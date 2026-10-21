import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ resetPasswordForEmail: vi.fn(), getUser: vi.fn(), updateUser: vi.fn() }));
vi.mock("@/awtad/lib/supabase", () => ({ sb: { auth } }));
import { requestPasswordRecovery, saveRecoveredPassword } from "@/awtad/lib/password-recovery";

beforeEach(() => {
  vi.resetAllMocks();
  auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  auth.getUser.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
  auth.updateUser.mockResolvedValue({ error: null });
});
describe("Password recovery", () => {
  it("sends an email with the public recovery callback", async () => {
    expect(await requestPasswordRecovery(" person@example.com ", "https://awtad.example")).toBeNull();
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("person@example.com", { redirectTo: "https://awtad.example/reset-password" });
  });
  it("does not send recovery to a username without an email", async () => {
    expect(await requestPasswordRecovery("employee", "https://awtad.example")).not.toBeNull();
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
  it("updates a recovered password without requesting the old password", async () => {
    expect(await saveRecoveredPassword("new-password", "new-password", true)).toBeNull();
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "new-password" });
  });
  it("rejects an ordinary session without a recovery link", async () => {
    expect(await saveRecoveredPassword("new-password", "new-password", false)).not.toBeNull();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it("rejects expired recovery sessions", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("expired") });
    expect(await saveRecoveredPassword("new-password", "new-password", true)).not.toBeNull();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it("rejects a mismatched confirmation", async () => {
    expect(await saveRecoveredPassword("new-password", "other-password", true)).not.toBeNull();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
});