import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

import { loadProjectEnv } from "./load-env.mjs";

loadProjectEnv();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is missing. Set a working PostgreSQL connection in .env or .env.local before running migrations.",
  );
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: true }
      : undefined,
});

try {
  const migrationsDir = path.join(process.cwd(), "db", "migrations");
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  await pool.query(`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const client = await pool.connect();
  try {
    for (const file of files) {
      const applied = await pool.query(
        "select 1 from schema_migrations where id = $1",
        [file],
      );
      if (applied.rowCount) {
        console.log(`skip ${file}`);
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (id) values ($1)", [
          file,
        ]);
        await client.query("commit");
        console.log(`applied ${file}`);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
