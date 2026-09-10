import "@testing-library/jest-dom/vitest";

import { beforeEach, afterEach, vi } from "vitest";
vi.mock("@/backend/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/backend/auth")>()),
  isAuthenticated: vi.fn(async () => true),
}));

beforeEach(() => {
  vi.stubEnv("AI_PROVIDER", "demo");
  vi.stubEnv("ELEVENLABS_API_KEY", "");
  vi.stubEnv("PRESENTON_API_URL", "");
  vi.stubEnv("DATABASE_URL", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
