import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllEnvs());

describe("optional GitHub App credentials", () => {
  it("loads without credentials and refuses use until the App is configured", async () => {
    vi.stubEnv("GITHUB_APP_ID", undefined);
    vi.stubEnv("GITHUB_PRIVATE_KEY", undefined);
    const { getAppOctokit, getInstallationOctokit } =
      await import("./github-app");
    expect(() => getAppOctokit()).toThrow("GITHUB_APP_ID");
    expect(() => getInstallationOctokit(1)).toThrow("GITHUB_APP_ID");
  });

  it("requires the signing key when the App ID has been configured", async () => {
    vi.stubEnv("GITHUB_APP_ID", "fixture-app");
    vi.stubEnv("GITHUB_PRIVATE_KEY", undefined);
    const { getAppOctokit } = await import("./github-app");
    expect(() => getAppOctokit()).toThrow("GITHUB_PRIVATE_KEY");
  });
});
