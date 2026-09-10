import { NextResponse } from "next/server";
import { guardApi } from "@/lib/api-guard";
import { readIngestRequest } from "@/lib/ingest-request";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const denied = await guardApi(request, "ingest");
  if (denied) return denied;
  try {
    const { source, documents, warnings } = await readIngestRequest(request);
    return NextResponse.json({
      source,
      documents,
      warnings,
      preview: [source.text, ...(source.documents ?? []), source.linkText]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 5000),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to ingest source.",
      },
      { status: 400 },
    );
  }
}
