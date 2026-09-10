import { guardApi } from "@/lib/api-guard";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateInfographicImage } from "@/agent/ai";

const schema = z.object({
  imagePrompt: z.string().trim().min(20).max(600),
});

export async function POST(request: NextRequest) {
  const denied = await guardApi(request, "transform");
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide imagePrompt (20-600 chars)." },
      { status: 400 },
    );
  }
  const result = await generateInfographicImage(parsed.data.imagePrompt);
  return NextResponse.json(result);
}
