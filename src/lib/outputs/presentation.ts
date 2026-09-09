import { GoogleGenAI } from "@google/genai";
import type { Artefact, SourceBundle, TransformControls } from "../types";

type Slide = { n: number; title: string; bullets: string[]; notes: string; imagePrompt?: string };

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
          imagePrompt: { type: "string" },
        },
      },
    },
  },
};

function slugify(input: string, fallback: string) {
  const words = input
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join(" ")
    .trim();
  const slug = words
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48)
    .replace(/^-|-$/g, "");
  return slug || fallback;
}

function digestibleName(bundle: SourceBundle, controls: TransformControls) {
  const sourceHead = bundle.text.trim().split(/\s+/).slice(0, 8).join(" ") || controls.audience || "briefing";
  const slug = slugify(sourceHead, "content-forge-deck");
  const date = new Date().toISOString().slice(0, 10);
  return `${slug}-${date}.pptx`;
}

function digestibleTitle(bundle: SourceBundle, controls: TransformControls) {
  const head = bundle.text.trim().slice(0, 70).replace(/\s+/g, " ").trim();
  if (head.length > 12) return head.slice(0, 62) + (head.length > 62 ? "…" : "");
  return `Briefing for ${controls.audience}`;
}

function fallbackSlides(bundle: SourceBundle, controls: TransformControls): Slide[] {
  const src = bundle.text.slice(0, 2500);
  const title = digestibleTitle(bundle, controls);
  return [
    { n: 1, title, bullets: [`For ${controls.audience}`, `Objective: ${controls.objective} • ${controls.tone}`], notes: `Opening — ${controls.tone} tone in ${controls.language}.`, imagePrompt: "abstract NTRO command center, teal slate" },
    { n: 2, title: "Agenda", bullets: ["Context", "Key Findings", "Implications", "Recommendations"], notes: "Roadmap of the deck.", imagePrompt: "minimal agenda timeline" },
    { n: 3, title: "Context", bullets: [src.slice(0, 110) || "Context from source", src.slice(110, 230) || "Additional background"], notes: src.slice(0, 280), imagePrompt: "policy context illustration" },
    { n: 4, title: "Key Finding 1", bullets: [src.slice(300, 410) || "Finding 1 headline", `Style: ${controls.style}`], notes: src.slice(300, 600), imagePrompt: "data chart hero" },
    { n: 5, title: "Key Finding 2", bullets: [src.slice(600, 710) || "Finding 2 headline", `Detail: ${controls.detail}`], notes: src.slice(600, 900), imagePrompt: "network nodes" },
    { n: 6, title: "Implications", bullets: [`Audience: ${controls.audience}`, `Objective: ${controls.objective}`], notes: `Implications in ${controls.tone} tone.`, imagePrompt: "implications arrow" },
    { n: 7, title: "Recommendations", bullets: ["Disseminate to stakeholders", "Monitor indicators", "Schedule follow-up briefing"], notes: "Actionable next steps.", imagePrompt: "checklist" },
    { n: 8, title: "Closing & Q&A", bullets: ["Summary", "Next steps — Content Forge"], notes: "Close and invite discussion.", imagePrompt: "closing dark slate" },
  ];
}

async function buildPptxBase64(slides: Slide[], title: string): Promise<string> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches
  pptx.author = "Content Forge";
  pptx.subject = title;
  pptx.title = title;
  pptx.company = "SIH PS 26154 — NTRO";

  const BG = "0F1B2A";
  const ACCENT = "14B8A6";
  const CARD = "162A45";
  const W = 13.33;
  const H = 7.5;

  // Define a simple master for consistent look
  pptx.defineSlideMaster({
    title: "FORGE_MASTER",
    background: { color: BG },
    objects: [{ rect: { x: 0, y: 0, w: W, h: 0.12, fill: { color: ACCENT } } }],
  });

  for (const s of slides) {
    const slide = pptx.addSlide({ masterName: "FORGE_MASTER" });

    // Title
    slide.addText(s.title, {
      x: 0.6, y: 0.35, w: 8.2, h: 0.6,
      fontSize: 24, color: "FFFFFF", bold: true, fontFace: "Calibri",
      valign: "middle",
    });

    // Bullets — use a single text box with newline-separated bullets for max compatibility
    const bulletText = s.bullets.filter(Boolean).map((b) => `• ${b}`).join("\n");
    slide.addText(bulletText, {
      x: 0.6, y: 1.15, w: 7.8, h: 2.9,
      fontSize: 11, color: "D1E0F0", fontFace: "Calibri",
      lineSpacingMultiple: 1.15, valign: "top",
    });

    // Right card — visual prompt (no fake image shape that confuses PowerPoint)
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 8.9, y: 1.15, w: 3.8, h: 2.9,
      fill: { color: CARD }, rectRadius: 0.15,
      line: { color: "1E3A5E", width: 1 },
    });
    slide.addText("VISUAL", {
      x: 9.0, y: 1.25, w: 3.6, h: 0.25,
      fontSize: 8, color: "7AA0C8", italic: true, fontFace: "Calibri", align: "left",
    });
    slide.addText((s.imagePrompt || "illustration").slice(0, 110), {
      x: 9.0, y: 1.55, w: 3.6, h: 1.2,
      fontSize: 9, color: "9AB0CC", fontFace: "Calibri", valign: "top",
    });
    slide.addText("Image placeholder — replace with generated visual", {
      x: 9.0, y: 3.45, w: 3.6, h: 0.35,
      fontSize: 7, color: "6B829E", italic: true, fontFace: "Calibri", align: "center",
    });

    // Speaker notes — real notes field (View → Notes Page in PowerPoint)
    slide.addNotes(s.notes.slice(0, 800));

    // Footer
    slide.addText(`${s.n} / ${slides.length}`, {
      x: 12.0, y: H - 0.35, w: 0.8, h: 0.2,
      fontSize: 7, color: "6B829E", align: "right", fontFace: "Calibri",
    });
    slide.addText("Content Forge • SIH 26154", {
      x: 0.6, y: H - 0.35, w: 3, h: 0.2,
      fontSize: 7, color: "6B829E", fontFace: "Calibri",
    });
  }

  // Use base64 output — verified to produce valid ZIP/PPTX
  const base64 = (await pptx.write({ outputType: "base64" })) as string;
  // sanity check — must start with UEsDB (PK zip)
  if (!base64.startsWith("UEsDB")) throw new Error("PPTX base64 header invalid");
  return base64;
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
        contents: `Source:\n${bundle.text.slice(0, 8000)}\n\nAudience: ${controls.audience}\nTone: ${controls.tone}\nLanguage: ${controls.language}\nDetail: ${controls.detail}\nObjective: ${controls.objective}\nStyle: ${controls.style}\n\nGenerate 8-12 slides as JSON per schema. Each slide: title (4-7 words), 2-4 bullets (each 8-18 words), speaker notes (1-2 sentences), imagePrompt (short visual description). Language must be ${controls.language}. Keep titles digestible.`,
        config: {
          systemInstruction: `You are Content Forge presentation generator for NTRO. Create concise, professional, digestible slide decks. Return JSON only per schema. Use ${controls.language}.`,
          responseMimeType: "application/json",
          responseJsonSchema: presentationJsonSchema,
        },
      });
      const parsed = JSON.parse(response.text ?? "{}") as { slides?: { title: string; bullets: string[]; notes: string; imagePrompt?: string }[] };
      if (Array.isArray(parsed.slides) && parsed.slides.length >= 8) {
        slides = parsed.slides.slice(0, 12).map((s, i) => ({
          n: i + 1,
          title: s.title?.slice(0, 64).trim() || `Slide ${i + 1}`,
          bullets: (s.bullets || []).slice(0, 4).map((b) => b.slice(0, 140).trim()).filter(Boolean),
          notes: (s.notes || "").slice(0, 800),
          imagePrompt: s.imagePrompt?.slice(0, 120),
        }));
        geminiUsed = true;
      }
    } catch {
      warnings.push("Gemini presentation generation failed — using deterministic fallback");
    }
  } else {
    warnings.push("GEMINI_API_KEY not set — using deterministic slide fallback (set key for AI-generated decks)");
  }

  const deckTitle = digestibleTitle(bundle, controls);
  const fileName = digestibleName(bundle, controls);

  let pptxBase64: string | undefined;
  try {
    pptxBase64 = await buildPptxBase64(slides, deckTitle);
  } catch (e) {
    warnings.push(`PPTX build failed: ${(e as Error).message}`);
  }

  const body = `# ${deckTitle}\n\n${slides.map((s) => `## Slide ${s.n}: ${s.title}\n${s.bullets.map((b) => `- ${b}`).join("\n")}\n\n*Notes:* ${s.notes}\n*Visual:* ${s.imagePrompt || ""}`).join("\n\n")}${pptxBase64 ? `\n\n**PPTX ready — ${fileName} — download below.**` : ""}`;

  return {
    type: "Presentation",
    title: deckTitle,
    body,
    metadata: {
      slides,
      slideCount: slides.length,
      provider: geminiUsed ? "gemini" : "fallback",
      model: geminiUsed ? process.env.GEMINI_MODEL || "gemini-3.6-flash" : undefined,
      pptxBase64,
      pptxFileName: fileName,
    },
    warnings,
    confidence: geminiUsed ? 82 : 66,
  };
}
