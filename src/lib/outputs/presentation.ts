import { GoogleGenAI } from "@google/genai";
import type { Artefact, SourceBundle, TransformControls } from "../types";

type Slide = { n: number; title: string; bullets: string[]; notes: string };

const presentationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["slides"],
  properties: {
    slides: {
      type: "array",
      minItems: 8,
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "bullets", "notes"],
        properties: {
          title: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
          notes: { type: "string" },
        },
      },
    },
  },
};

function fallbackSlides(bundle: SourceBundle, controls: TransformControls): Slide[] {
  const src = bundle.text.slice(0, 2500);
  return [
    { n: 1, title: "Title", bullets: [`Briefing for ${controls.audience}`, `Objective: ${controls.objective}`], notes: `Opening — ${controls.tone} tone, ${controls.language}` },
    { n: 2, title: "Agenda", bullets: ["Context", "Key Findings", "Implications", "Recommendations"], notes: "Roadmap of the deck." },
    { n: 3, title: "Context", bullets: [src.slice(0, 120), src.slice(120, 240)], notes: src.slice(0, 300) },
    { n: 4, title: "Key Finding 1", bullets: [src.slice(300, 420), `Style: ${controls.style}`], notes: src.slice(300, 600) },
    { n: 5, title: "Key Finding 2", bullets: [src.slice(600, 720), `Detail: ${controls.detail}`], notes: src.slice(600, 900) },
    { n: 6, title: "Implications", bullets: [`Audience: ${controls.audience}`, `Objective: ${controls.objective}`], notes: `Implications in ${controls.tone} tone.` },
    { n: 7, title: "Recommendations", bullets: ["Action 1: Disseminate", "Action 2: Monitor indicators", "Action 3: Follow-up briefing"], notes: "Actionable next steps." },
    { n: 8, title: "Closing & Q&A", bullets: ["Summary", "Q&A — Content Forge"], notes: "Close and invite discussion." },
  ];
}

export async function generatePresentation(bundle: SourceBundle, controls: TransformControls): Promise<Artefact> {
  let slides: Slide[] = fallbackSlides(bundle, controls);
  const warnings: string[] = [];
  let geminiUsed = false;

  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
      const response = await client.models.generateContent({
        model,
        contents: `Source:\n${bundle.text.slice(0, 8000)}\n\nAudience: ${controls.audience}\nTone: ${controls.tone}\nLanguage: ${controls.language}\nDetail: ${controls.detail}\nObjective: ${controls.objective}\nStyle: ${controls.style}\n\nGenerate 8-12 slides as JSON per schema. Each slide: title, 3-5 bullets, speaker notes. Language must be ${controls.language}.`,
        config: {
          systemInstruction: `You are Content Forge presentation generator. Create concise, professional slide decks for NTRO. Return JSON only per schema. Use ${controls.language}.`,
          responseMimeType: "application/json",
          responseJsonSchema: presentationJsonSchema,
        },
      });
      const parsed = JSON.parse(response.text ?? "{}") as { slides?: { title: string; bullets: string[]; notes: string }[] };
      if (Array.isArray(parsed.slides) && parsed.slides.length >= 8) {
        slides = parsed.slides.slice(0, 12).map((s, i) => ({ n: i + 1, title: s.title?.slice(0, 80) || `Slide ${i + 1}`, bullets: (s.bullets || []).slice(0, 5), notes: s.notes || "" }));
        geminiUsed = true;
      }
    } catch {
      warnings.push("Gemini presentation generation failed — using deterministic fallback");
    }
  } else {
    warnings.push("GEMINI_API_KEY not set — using deterministic slide fallback (set key for AI-generated decks)");
  }

  const body = `# Presentation Deck${geminiUsed ? " (Gemini)" : " (Fallback)"}\n\n${slides.map((s) => `## Slide ${s.n}: ${s.title}\n${s.bullets.map((b) => `- ${b}`).join("\n")}\n\n*Speaker notes:* ${s.notes}`).join("\n\n")}`;

  return {
    type: "Presentation",
    title: "Presentation — Slides + Speaker Notes",
    body,
    metadata: { slides, slideCount: slides.length, provider: geminiUsed ? "gemini" : "fallback", model: geminiUsed ? process.env.GEMINI_MODEL || "gemini-3.6-flash" : undefined },
    warnings,
    confidence: geminiUsed ? 82 : 66,
  };
}
