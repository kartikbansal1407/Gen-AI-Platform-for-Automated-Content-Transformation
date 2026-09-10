// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const query = vi.hoisted(() => vi.fn());
vi.mock("@/backend/db", () => ({
  hasDatabase: () => true,
  getPool: () => ({ query }),
}));
import { guardApi } from "./api-guard";
const request = () => new Request("http://localhost/api/transform");
beforeEach(() => {
  query.mockReset();
});
it.each([
  ["42P01", "DATABASE_SCHEMA_MISSING"],
  ["42703", "DATABASE_SCHEMA_MISSING"],
  ["28000", "DATABASE_AUTH_FAILED"],
  ["28P01", "DATABASE_AUTH_FAILED"],
  ["3D000", "DATABASE_NOT_FOUND"],
  ["ECONNREFUSED", "DATABASE_UNAVAILABLE"],
])(
  "explains database error %s without leaking details or bypassing the limiter",
  async (code, expected) => {
    query.mockRejectedValue({ code, message: "sensitive-connection-details" });
    const response = await guardApi(request(), "transform");
    expect(response?.status).toBe(503);
    const body = await response!.json();
    expect(body.code).toBe(expected);
    expect(body.error).not.toContain("sensitive-connection-details");
    if (expected === "DATABASE_AUTH_FAILED")
      expect(body.error).not.toContain("migrate");
  },
);
it("allows generation after database recovery and still enforces the shared limit", async () => {
  query
    .mockRejectedValueOnce({ code: "28000" })
    .mockResolvedValueOnce({ rows: [{ count: 1 }] })
    .mockResolvedValueOnce({ rows: [{ count: 11 }] });
  expect((await guardApi(request(), "transform"))?.status).toBe(503);
  expect(await guardApi(request(), "transform")).toBeNull();
  expect((await guardApi(request(), "transform"))?.status).toBe(429);
});
