import { NextResponse } from "next/server";
import { isAuthenticated } from "@/backend/auth";
import { getPool, hasDatabase } from "@/backend/db";
import { createHash } from "node:crypto";
import { databaseSetupError } from "./database-error";

const buckets = new Map<string, { count: number; expires: number }>();
export async function guardApi(
  request: Request,
  action?: "transform" | "ingest",
) {
  if (!(await isAuthenticated()))
    return NextResponse.json(
      { error: "Sign in to continue." },
      { status: 401 },
    );
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Cross-origin request rejected." },
      { status: 403 },
    );
  if (!action) return null;
  // Only trust proxy headers when the deployment explicitly opts in (Vercel sets this header).
  const ip = process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for")
    : process.env.TRUST_PROXY === "true"
      ? request.headers.get("x-forwarded-for")
      : null;
  const key = createHash("sha256")
    .update(`${action}:${ip?.split(",")[0].trim() ?? "local-operator"}`)
    .digest("hex");
  const limit = action === "transform" ? 10 : 60;
  const now = Date.now();
  let count: number;
  if (hasDatabase()) {
    try {
      const result = await getPool().query<{ count: number }>(
        `insert into request_limits (key, count, expires_at) values ($1, 1, now() + interval '1 hour') on conflict (key) do update set count = case when request_limits.expires_at <= now() then 1 else request_limits.count + 1 end, expires_at = case when request_limits.expires_at <= now() then now() + interval '1 hour' else request_limits.expires_at end returning count`,
        [key],
      );
      count = result.rows[0].count;
    } catch (error) {
      return NextResponse.json(databaseSetupError(error), { status: 503 });
    }
  } else {
    for (const [key, value] of buckets)
      if (value.expires <= now) buckets.delete(key);
    const bucket = buckets.get(key) ?? { count: 0, expires: now + 3600000 };
    bucket.count++;
    buckets.set(key, bucket);
    count = bucket.count;
  }
  return count > limit
    ? NextResponse.json(
        { error: `Limit reached: ${limit} ${action} requests per hour.` },
        { status: 429, headers: { "Retry-After": "3600" } },
      )
    : null;
}

export async function readBoundedBody(
  request: Request,
  limit = 45 * 1024 * 1024,
) {
  if (Number(request.headers.get("content-length") ?? 0) > limit)
    throw new Error("Request body too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Request body required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error("Request body too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
