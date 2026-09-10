import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    video: "on",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      CONTENT_FORGE_DIST_DIR: ".next/e2e",
      AI_PROVIDER: "demo",
      DATABASE_URL: "",
      CONTENT_FORGE_ACCESS_CODE: "test-operator-code",
      ORBITA_ACCESS_CODE: "",
      GEMINI_API_KEY: "",
      OPENAI_API_KEY: "",
      ELEVENLABS_API_KEY: "",
      PRESENTON_API_URL: "",
      NEXT_PUBLIC_LEGACY_ORBITA: "true",
    },
  },
});
