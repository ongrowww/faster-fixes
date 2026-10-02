import { afterEach, describe, expect, it, vi } from "vitest";

const { cloudflare, custom } = vi.hoisted(() => ({
  cloudflare: vi.fn(() => ({ provider: "r2" })),
  custom: vi.fn(() => ({ provider: "s3" })),
}));
vi.mock("@better-upload/server/clients", () => ({ cloudflare, custom }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
});

function configureS3(endpoint = "https://objects.example.test:9443") {
  vi.stubEnv("STORAGE_PROVIDER", "s3");
  vi.stubEnv("STORAGE_ENDPOINT", endpoint);
  vi.stubEnv("STORAGE_REGION", "example-region");
  vi.stubEnv("AWS_ACCESS_KEY_ID", "fixture-access");
  vi.stubEnv("AWS_SECRET_ACCESS_KEY", "fixture-secret");
  vi.stubEnv("STORAGE_FORCE_PATH_STYLE", "true");
}

describe("self-hosted asset storage", () => {
  it("keeps R2 as the default without requiring build-time credentials", async () => {
    vi.stubEnv("STORAGE_PROVIDER", undefined);
    const storage = await import("./index");
    expect(storage.storageProvider).toBe("r2");
    expect(cloudflare).toHaveBeenCalledOnce();
    expect(custom).not.toHaveBeenCalled();
  });

  it("uses the configured endpoint, TLS, region and bucket addressing for S3", async () => {
    configureS3();
    const storage = await import("./index");
    expect(storage.storageProvider).toBe("s3");
    expect(custom).toHaveBeenCalledWith({
      host: "objects.example.test:9443",
      region: "example-region",
      secure: true,
      forcePathStyle: true,
      accessKeyId: "fixture-access",
      secretAccessKey: "fixture-secret",
    });
  });

  it.each([
    "https://objects.example.test/bucket",
    "https://user:password@objects.example.test",
    "ftp://objects.example.test",
    "https://objects.example.test?key=value",
  ])(
    "rejects an endpoint the S3 client cannot represent: %s",
    async (endpoint) => {
      configureS3(endpoint);
      await expect(import("./index")).rejects.toThrow(
        "STORAGE_ENDPOINT must be an HTTP(S) origin",
      );
      expect(custom).not.toHaveBeenCalled();
    },
  );

  it("rejects an unsupported provider rather than routing assets to R2", async () => {
    vi.stubEnv("STORAGE_PROVIDER", "unknown");
    await expect(import("./index")).rejects.toThrow(
      "Unsupported STORAGE_PROVIDER",
    );
  });
});
