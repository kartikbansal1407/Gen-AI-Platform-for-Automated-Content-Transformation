// @vitest-environment node
import { expect, it, vi } from "vitest";
import { guardApi } from "./api-guard";
it("limits single, batch and refinement to the shared ten-job bucket", async () => {
  vi.stubEnv("TRUST_PROXY", "true");
  vi.stubEnv("VERCEL", "");
  const request = new Request("http://localhost/api/transform", {
    headers: { "x-forwarded-for": "192.0.2.100" },
  });
  for (let i = 0; i < 10; i++)
    expect(await guardApi(request, "transform")).toBeNull();
  const denied = await guardApi(request, "transform");
  expect(denied?.status).toBe(429);
  expect(denied?.headers.get("Retry-After")).toBe("3600");
});
