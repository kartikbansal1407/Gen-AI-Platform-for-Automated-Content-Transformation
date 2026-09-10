// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.unmock("@/backend/auth");
const cookie = vi.hoisted(() => ({ value: "" }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: cookie.value }) }),
}));
import { createSession, isAuthenticated, isValidAccessCode } from "./auth";
beforeEach(() => {
  cookie.value = "";
  vi.stubEnv("CONTENT_FORGE_ACCESS_CODE", "test-code");
  vi.stubEnv("ORBITA_ACCESS_CODE", "");
});
it("requires a signed cookie even in local demo mode", async () => {
  vi.stubEnv("CONTENT_FORGE_ACCESS_CODE", "");
  expect(await isAuthenticated()).toBe(false);
  cookie.value = createSession();
  expect(await isAuthenticated()).toBe(true);
});
it("rejects forged, malformed and expired sessions without throwing", async () => {
  const valid = createSession();
  for (const invalid of [
    "demo-session",
    `9999999999999.${"0".repeat(64)}`,
    `${valid}.extra`,
    `${valid.split(".")[0]}.${"é".repeat(64)}`,
    "NaN.abc",
  ]) {
    cookie.value = invalid;
    expect(await isAuthenticated()).toBe(false);
  }
  cookie.value = valid;
  vi.spyOn(Date, "now").mockReturnValue(Number(valid.split(".")[0]));
  expect(await isAuthenticated()).toBe(false);
});
it("accepts only the configured code and invalidates cookies when it changes", async () => {
  expect(isValidAccessCode("wrong")).toBe(false);
  expect(isValidAccessCode("test-code")).toBe(true);
  cookie.value = createSession();
  vi.stubEnv("CONTENT_FORGE_ACCESS_CODE", "replacement-code");
  expect(await isAuthenticated()).toBe(false);
});
it("does not permit unconfigured production login", () => {
  vi.stubEnv("CONTENT_FORGE_ACCESS_CODE", "");
  vi.stubEnv("NODE_ENV", "production");
  expect(isValidAccessCode("demo")).toBe(false);
});
