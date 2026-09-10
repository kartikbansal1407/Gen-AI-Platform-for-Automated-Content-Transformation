import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, rename } from "node:fs/promises";
import { resolve } from "node:path";

const baseURL = "http://localhost:3101";
const server = spawn(
  "npm",
  ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3101"],
  {
    stdio: "ignore",
    detached: true,
    env: {
      ...process.env,
      CONTENT_FORGE_DIST_DIR: ".next/demo",
      AI_PROVIDER: "demo",
      GEMINI_API_KEY: "",
      OPENAI_API_KEY: "",
      DATABASE_URL: "",
      CONTENT_FORGE_ACCESS_CODE: "",
      ORBITA_ACCESS_CODE: "",
      ELEVENLABS_API_KEY: "",
      PRESENTON_API_URL: "",
    },
  },
);
let browser;
try {
  const deadline = Date.now() + 120000;
  while (true) {
    try {
      if ((await fetch(baseURL)).ok) break;
    } catch {
      /* Wait for the local dev server. */
    }
    if (Date.now() > deadline) throw new Error("Demo server did not start.");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  await mkdir("test-results/demo-capture", { recursive: true });
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: {
      dir: "test-results/demo-capture",
      size: { width: 1440, height: 1000 },
    },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const pause = () => page.waitForTimeout(2500); // Deliberate pacing for a human-viewable recording, not a test assertion.
  await page.goto(baseURL);
  await page
    .getByRole("heading", { name: "Sign in to Content Forge" })
    .waitFor();
  await pause();
  await page.screenshot({ path: "docs/login.png", fullPage: true });
  await page.getByLabel("Operator access code").fill("demo");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Dashboard", exact: true }).waitFor();
  await pause();
  await page.screenshot({ path: "docs/dashboard.png", fullPage: true });
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "New Transformation", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "New Transformation", exact: true })
    .waitFor();
  await pause();
  await page
    .getByLabel("Upload source files")
    .setInputFiles("e2e/fixtures/incident-report.pdf");
  await pause();
  await page
    .getByRole("button", { name: "Prepare source", exact: true })
    .click();
  await page.getByRole("heading", { name: "Source ready" }).waitFor();
  await page
    .getByRole("region", { name: "Source preview" })
    .scrollIntoViewIfNeeded();
  await pause();
  await page.getByRole("checkbox", { name: /Advisory/ }).click();
  await page.getByRole("checkbox", { name: /Infographic/ }).click();
  await pause();
  await page
    .getByRole("button", { name: "Generate 3 output(s)", exact: true })
    .click();
  await page.getByRole("heading", { name: "3 artefacts · done" }).waitFor();
  await page
    .getByRole("heading", { name: "3 artefacts · done" })
    .scrollIntoViewIfNeeded();
  await pause();
  await page.getByRole("tab", { name: "Advisory", exact: true }).click();
  await pause();
  await page.screenshot({
    path: "/private/tmp/content-forge-preview.png",
    fullPage: true,
  });
  await page
    .getByRole("tab", { name: "Executive Summary", exact: true })
    .click();
  await pause();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all as ZIP" }).click();
  await download;
  await pause();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "History", exact: true })
    .click();
  await page
    .getByRole("button")
    .filter({ hasText: "18 advisories" })
    .first()
    .click();
  await page.getByRole("tab").first().waitFor();
  await pause();
  const video = page.video();
  await context.close();
  await rename(await video.path(), "docs/demo.webm");
  const deck = await browser.newPage();
  await deck.goto(`file://${resolve("docs/evaluation-deck.html")}`);
  await deck.pdf({
    path: "docs/evaluation-deck.pdf",
    preferCSSPageSize: true,
    printBackground: true,
  });
  console.log("Saved docs/demo.webm and docs/evaluation-deck.pdf");
} finally {
  await browser?.close();
  if (server.pid) process.kill(-server.pid, "SIGTERM");
}
