import { NextResponse } from "next/server";
import { hasDatabase } from "@/backend/db";
import { listJobs } from "@/backend/jobs";
import { guardApi } from "@/lib/api-guard";
export async function GET(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  if (!hasDatabase()) return NextResponse.json({ jobs: [], mode: "browser" });
  try {
    return NextResponse.json({ jobs: await listJobs(), mode: "database" });
  } catch {
    return NextResponse.json(
      { error: "History unavailable. Check database migrations.", jobs: [] },
      { status: 503 },
    );
  }
}
