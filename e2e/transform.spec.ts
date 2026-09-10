import { test, expect, type Page } from "@playwright/test";

const sections = [
  "Dashboard",
  "New Transformation",
  "Documents",
  "Workspace",
  "Review Queue",
  "History",
  "Analytics",
  "Settings",
];

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Operator access code").fill("test-operator-code");
  await page.getByRole("button", { name: "Open workspace", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
}

async function navigate(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name, exact: true })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}

test("authenticated workspace: PDF, three outputs, refinement, review, documents, analytics and deletion", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("navigation").getByRole("link")).toHaveText(sections);

  await navigate(page, "New Transformation");
  await expect(page.getByRole("checkbox", { name: /Executive Summary/ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /LinkedIn/ })).toBeHidden();

  await page.getByLabel("Choose files").setInputFiles("e2e/fixtures/incident-report.pdf");
  await page.getByRole("button", { name: "Prepare source", exact: true }).click();
  await expect(page.getByText("Source ready", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Source preview" })).toContainText("18 advisories");

  await page.getByRole("checkbox", { name: /Advisory/ }).click();
  await page.getByText("Additional publishing formats", { exact: true }).click();
  await page.getByRole("checkbox", { name: /LinkedIn/ }).click();
  await page.getByRole("button", { name: "Generate 3 outputs", exact: true }).click();

  await expect(page.getByRole("heading", { name: "3 deliverables ready" })).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(3);
  await page.getByRole("tab", { name: "Advisory", exact: true }).click();
  await expect(page.getByRole("article", { name: "advisory artefact" })).toContainText("18 advisories");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export workspace", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.zip$/);

  await navigate(page, "Documents");
  await page.getByLabel("Search documents").fill("incident-report.pdf");
  await page.getByRole("button", { name: "incident-report.pdf", exact: true }).click();
  await expect(page.locator("pre")).toContainText("18 advisories");
  await page.getByRole("link", { name: "Open transformation", exact: true }).click();
  await expect(page.getByRole("tab")).toHaveCount(3);

  await page.getByRole("link", { name: "Review", exact: true }).click();
  const pendingAdvisory = page.getByRole("button").filter({ hasText: /Advisory/ }).filter({ hasText: /pending/i }).first();
  await pendingAdvisory.click();
  await page.getByLabel("Review note").fill("Source evidence checked.");
  await page.getByRole("button", { name: "Approve artefact" }).click();

  await page.getByRole("combobox").selectOption("approved");
  const approvedAdvisory = page.getByRole("button").filter({ hasText: /Advisory/ }).filter({ hasText: /approved/i }).first();
  await approvedAdvisory.click();
  await expect(page.getByLabel("Review note")).toHaveValue("Source evidence checked.");

  await page.reload();
  await page.getByRole("combobox").selectOption("approved");
  await page.getByRole("button").filter({ hasText: /Advisory/ }).filter({ hasText: /approved/i }).first().click();
  await expect(page.getByLabel("Review note")).toHaveValue("Source evidence checked.");

  await page.getByRole("link", { name: "Open in Workspace" }).click();
  await page.getByRole("tab", { name: "Advisory", exact: true }).click();
  await page.getByLabel("Refine this artefact").fill("Make this advisory more formal.");
  await page.getByRole("button", { name: "Refine deliverable", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Artefact updated.");

  await navigate(page, "Review Queue");
  await expect(page.getByRole("button").filter({ hasText: /Advisory/ }).filter({ hasText: /pending/i }).first()).toBeVisible();

  await navigate(page, "Analytics");
  await expect(page.getByText("Based on 1 loaded transformations", { exact: false })).toBeVisible();
  await expect(page.getByText("Generated output formats", { exact: true })).toBeVisible();
  await expect(page.getByText(/engagement|followers|impressions/i)).toHaveCount(0);

  await navigate(page, "Settings");
  await expect(page.getByText(/platform integrations|personal memory|LinkedIn|Reddit|campaigns/i)).toHaveCount(0);
  await page.getByLabel("Theme", { exact: true }).selectOption("dark");
  await page.reload();
  await expect(page.getByLabel("Theme", { exact: true })).toHaveValue("dark");

  const workspaceDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export workspace" }).click();
  expect((await workspaceDownload).suggestedFilename()).toBe("content-forge-workspace.json");

  await navigate(page, "History");
  await page.getByLabel("Search transformations").fill("18 advisories");
  await page.getByRole("button").filter({ hasText: "18 advisories" }).click();
  await expect(page.getByRole("tab")).toHaveCount(3);
  await page.getByRole("button", { name: "Delete transformation", exact: true }).click();
  await expect(page.getByText("No transformation history yet.")).toBeVisible();

  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/jobs")).status()).toBe(401);
  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/login$/);
});

test("rejects wrong access codes and supports mobile navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Operator access code").fill("wrong-code");
  await page.getByRole("button", { name: "Open workspace", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "not accepted" })).toBeVisible();

  await login(page);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation").getByRole("link")).toHaveText(sections);
  await navigate(page, "Settings");
  await expect(page.getByRole("navigation")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
