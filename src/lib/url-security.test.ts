// @vitest-environment node
import { expect, it, vi } from "vitest";
vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
import { lookup } from "node:dns/promises";
import { resolvePublicUrl } from "./safe-fetch";
it("blocks DNS resolving to private addresses even in a mixed response", async () => {
  vi.mocked(lookup).mockResolvedValue([
    { address: "8.8.8.8", family: 4 },
    { address: "10.0.0.1", family: 4 },
  ] as never);
  await expect(resolvePublicUrl("https://example.org/")).rejects.toThrow(
    "Private",
  );
});
it("enforces the configured hostname allowlist", async () => {
  vi.stubEnv("INGEST_ALLOWED_HOSTS", "allowed.example");
  await expect(resolvePublicUrl("https://other.example/")).rejects.toThrow(
    "not allowed",
  );
});
