import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeSourceBundle } from "@/lib/ingest/normalize";
import { fetchUrlContent } from "@/lib/ingest/url";
import { transformSource } from "@/lib/transform";

const controlsSchema = z.object({
  audience: z.string().min(2).max(180),
  tone: z.enum(["Analytical", "Conversational", "Formal", "Persuasive", "Advisory", "Playful"]),
  language: z.enum(["English", "Hindi", "Hinglish"]),
  detail: z.enum(["Brief", "Standard", "Detailed"]),
  objective: z.string().min(2).max(40),
  style: z.enum(["Professional", "Journalistic", "Technical", "Narrative", "Bullet-brief"]),
  outputs: z.array(z.enum(["Video", "LinkedIn", "Twitter", "Advisory", "Infographic", "ExecutiveSummary", "Presentation"])).min(1),
});

const requestSchema = z.object({
  text: z.string().min(1).max(60000).optional().default(""),
  prompt: z.string().max(5000).optional(),
  url: z.string().url().optional().or(z.literal("")),
  docs: z.array(z.object({ filename: z.string(), mime: z.string(), text: z.string().max(80000) })).optional(),
  controls: controlsSchema,
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let urlMeta = null;
  if (parsed.data.url) {
    try {
      urlMeta = await fetchUrlContent(parsed.data.url);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  }

  const bundle = normalizeSourceBundle({
    text: parsed.data.text,
    prompt: parsed.data.prompt,
    docs: parsed.data.docs,
    urlMeta: urlMeta ? { url: urlMeta.url, title: urlMeta.title, text: urlMeta.text } : null,
  });

  if (!bundle.text.trim()) return NextResponse.json({ error: "No source content provided" }, { status: 400 });

  const result = await transformSource(bundle, parsed.data.controls as never);
  const jobId = `job-${Date.now()}`;
  return NextResponse.json({ jobId, ...result, status: result.artefacts.some((a) => a.warnings.includes("Generation failed")) ? "partial" : "done" });
}
