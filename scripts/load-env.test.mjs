// @vitest-environment node
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, expect, it } from "vitest";
const directories = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});
function readConfig(files, mode = "development", supplied = {}) {
  const directory = mkdtempSync(join(tmpdir(), "forge-env-test-"));
  directories.push(directory);
  for (const [name, value] of Object.entries(files))
    writeFileSync(join(directory, name), value);
  const script = `import { loadProjectEnv } from ${JSON.stringify(new URL("./load-env.mjs", import.meta.url).href)}; loadProjectEnv(${JSON.stringify(directory)}); process.stdout.write(process.env.DATABASE_URL ?? "unset");`;
  // These tests use synthetic environment values, never project credentials.
  return execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    env: { NODE_ENV: mode, ...supplied },
    encoding: "utf8",
  });
}
it("loads the base .env file used by the app, with quotes and variable expansion", () => {
  expect(
    readConfig({
      ".env":
        'DB_NAME=forge_test\nDATABASE_URL="postgres://localhost/$DB_NAME"\n',
    }),
  ).toBe("postgres://localhost/forge_test");
});
it("uses development precedence and does not load production credentials locally", () => {
  expect(
    readConfig({
      ".env": "DATABASE_URL=base",
      ".env.local": "DATABASE_URL=local",
      ".env.development.local": "DATABASE_URL=development",
      ".env.production.local": "DATABASE_URL=production",
    }),
  ).toBe("development");
});
it("uses production precedence and preserves explicit environment values including empty strings", () => {
  const files = {
    ".env": "DATABASE_URL=base",
    ".env.local": "DATABASE_URL=local",
    ".env.production.local": "DATABASE_URL=production",
  };
  expect(readConfig(files, "production")).toBe("production");
  expect(readConfig(files, "production", { DATABASE_URL: "explicit" })).toBe(
    "explicit",
  );
  expect(readConfig(files, "production", { DATABASE_URL: "" })).toBe("");
});
