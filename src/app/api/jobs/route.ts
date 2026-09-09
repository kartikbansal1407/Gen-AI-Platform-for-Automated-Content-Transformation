import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ jobs: [], note: "Jobs persisted to DB when DATABASE_URL set; otherwise browser localStorage" });
}
