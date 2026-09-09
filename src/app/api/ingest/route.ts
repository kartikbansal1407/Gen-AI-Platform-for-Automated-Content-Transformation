import { NextRequest, NextResponse } from "next/server";
import { parseBuffer } from "@/lib/ingest/parse";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 25 MB)" }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = await parseBuffer(buf, file.type || "application/octet-stream", file.name);
    // sanity: if still looks like binary PDF, flag it
    const looksBinary = parsed.text.includes("%PDF") && parsed.text.includes("obj") && parsed.text.length < 500;
    if (looksBinary) {
      return NextResponse.json({ ...parsed, warning: "PDF appears scanned or binary — text extraction limited" });
    }
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
