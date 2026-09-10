import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi, readBoundedBody } from "@/lib/api-guard";

export const runtime = "nodejs";
export const maxDuration = 300;

const outputSchema = z.enum([
  "presentation",
  "advisory",
  "video",
  "infographic",
  "twitter",
]);

const requestSchema = z.object({
  text: z.string().min(20).max(100_000),
  output_types: z.array(outputSchema).min(1),
  controls: z
    .object({
      audience: z.string().max(180).optional(),
      tone: z.string().max(80).optional(),
      language: z.string().max(80).optional(),
      detail_level: z.enum(["brief", "standard", "detailed"]).optional(),
    })
    .optional(),
});

const backendUrl = () =>
  process.env.OMNIFORM_API_URL ?? "http://127.0.0.1:8000";

export async function POST(request: Request) {
  const denied = await guardApi(request, "transform");
  if (denied) return denied;
  try {
    const body = requestSchema.parse(
      JSON.parse(
        (await readBoundedBody(request, 2 * 1024 * 1024)).toString("utf8"),
      ),
    );
    const upstream = await fetch(`${backendUrl()}/api/transform`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(280_000),
    });
    const payload = await upstream.json();
    return NextResponse.json(payload, { status: upstream.status });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return NextResponse.json(
        { error: "Invalid transformation request." },
        { status: 400 },
      );
    return NextResponse.json(
      {
        error:
          "OmniForm backend is unavailable. Start the FastAPI service and retry.",
      },
      { status: 503 },
    );
  }
}

export async function GET() {
  try {
    const upstream = await fetch(`${backendUrl()}/api/output-types`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) throw new Error("Backend unavailable.");
    return NextResponse.json(await upstream.json());
  } catch {
    return NextResponse.json(
      {
        error:
          "OmniForm backend is unavailable. Start the FastAPI service and retry.",
      },
      { status: 503 },
    );
  }
}
