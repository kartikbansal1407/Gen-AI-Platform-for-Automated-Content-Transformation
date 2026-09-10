import env from "@next/env";

// Match `next dev` locally and `next start` when NODE_ENV=production.
// This includes .env and preserves Next's precedence, quoting and expansion.
export function loadProjectEnv(directory = process.cwd()) {
  return env.loadEnvConfig(directory, process.env.NODE_ENV !== "production");
}
