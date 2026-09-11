import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAiCommandPlan } from "@/lib/ai";

const requestSchema = z.object({
  command: z.string().trim().min(3).max(1200),
});

const refineSchema = z.object({
  jobId: z.string().min(1),
  artefactType: z.enum(["Video", "LinkedIn", "Twitter", "Advisory", "Infographic", "ExecutiveSummary", "Presentation"]),
  instruction: z.string().min(3).max(2000),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  // refine mode
  const refineParsed = refineSchema.safeParse(body);
  if (refineParsed.success) {
    return NextResponse.json({ mode: "demo", refined: true, artefactType: refineParsed.data.artefactType, instruction: refineParsed.data.instruction, note: "Refine not yet persisted — wire to transform orchestrator" });
  }
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Tell Content Forge what you want to accomplish in a sentence or two." },
      { status: 400 },
    );
  }

  const result = await createAiCommandPlan(parsed.data.command);
  return NextResponse.json(result);
}
