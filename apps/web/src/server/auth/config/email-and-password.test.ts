import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mailer/client", () => ({
  mailer: { emails: { send: vi.fn() } },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("self-hosted authentication policy", () => {
  it.each([undefined, "false", "unexpected"])(
    "blocks direct email sign-up unless explicitly enabled (%s)",
    async (value) => {
      vi.stubEnv("REGISTRATION_ENABLED", value);
      const { emailAndPassword } = await import("./email-and-password");
      expect(emailAndPassword.enabled).toBe(true);
      expect(emailAndPassword.disableSignUp).toBe(true);
    },
  );

  it("permits account provisioning only with the explicit registration flag", async () => {
    vi.stubEnv("REGISTRATION_ENABLED", "true");
    const { emailAndPassword } = await import("./email-and-password");
    expect(emailAndPassword.disableSignUp).toBe(false);
  });

  it("requires verified email by default", async () => {
    vi.stubEnv("EMAIL_VERIFICATION_REQUIRED", undefined);
    const { emailAndPassword } = await import("./email-and-password");
    expect(emailAndPassword.requireEmailVerification).toBe(true);
  });

  it("supports the existing explicit verification override", async () => {
    vi.stubEnv("EMAIL_VERIFICATION_REQUIRED", "false");
    const { emailAndPassword } = await import("./email-and-password");
    expect(emailAndPassword.requireEmailVerification).toBe(false);
  });
});
