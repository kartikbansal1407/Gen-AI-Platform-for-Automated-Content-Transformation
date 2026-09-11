import { GoogleGenAI } from "@google/genai";
import type { Artefact, SourceBundle, TransformControls } from "../types";

// ── Elite 6-Phase Chain Types ──
type Slide = {
  n: number;
  title: string;
  bullets: string[];
  notes: string;
  layoutConcept: string;
  visualDirection: string;
  designNotes: string;
  imageBase64?: string;
};

type Phase1Section = {
  sectionTitle: string;
  description: string;
  headline: string;
  microCopy: string[];
  visualPrompt: string;
  colorTheme: string;
  designNotes: string;
};
type Phase1Out = { sections: Phase1Section[] };
type Phase2Out = { titleSlides: { headline: string; summary: string }[] };
type Phase3Out = { slides: { sectionIndex: number; bullets: string[] }[] };
type Phase4Out = { notes: { slideIndex: number; speakerNotes: string }[] };
type Phase5Out = { title: string; summary: string; significance: string[]; callToAction: string };
type Phase6Out = { coherence: string; feedback: string[]; recommendations: string[] };

// ── Helpers ──
function slugify(input: string, fallback: string) {
  const words = input.replace(/[^a-zA-Z0-9\s-]/g, "").trim().split(/\s+/).slice(0, 6).join(" ").trim();
  const slug = words.toLowerCase().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 48).replace(/^-|-$/g, "");
  return slug || fallback;
}
function digestibleName(bundle: SourceBundle, controls: TransformControls) {
  const sourceHead = bundle.text.trim().split(/\s+/).slice(0, 8).join(" ") || controls.audience || "briefing";
  const slug = slugify(sourceHead, "content-forge-deck");
  const date = new Date().toISOString().slice(0, 10);
  return `${slug}-${date}.pptx`;
}
function digestibleTitle(bundle: SourceBundle, controls: TransformControls) {
  const head = bundle.text.trim().slice(0, 90).replace(/\s+/g, " ").trim();
  if (head.length <= 12) return `Briefing for ${controls.audience}`;
  // Cut at word boundary so titles never end mid-word like "bitco"
  if (head.length <= 60) return head;
  const cut = head.slice(0, 60);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = (lastSpace > 30 ? cut.slice(0, lastSpace) : cut).replace(/[.,:;—-]+$/, "").trim();
  // Capitalize first letter
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
function stripMd(s: string) {
  return s.replace(/\*\*/g, "").replace(/__+/g, "").replace(/^#+\s*/gm, "").replace(/```/g, "").replace(/�/g, "").trim();
}
function clean(s: string) {
  return stripMd(s).replace(/[^\x09\x0A\x0D\x20-\x7E\u0900-\u097F\u00A0-\u00FF\n]/g, " ").replace(/\s+/g, " ").trim();
}

function themeFor(controls: TransformControls) {
  const toneMap: Record<string, { bg: string; accent: string; card: string; accent2: string }> = {
    Analytical: { bg: "0F1B2A", accent: "14B8A6", card: "162A45", accent2: "38BDF8" },
    Conversational: { bg: "0F2A2E", accent: "2DD4BF", card: "16403A", accent2: "5EEAD4" },
    Formal: { bg: "0B1628", accent: "C9A86A", card: "1A2A44", accent2: "8CA0BE" },
    Persuasive: { bg: "1A1242", accent: "7C3AED", card: "2A1F5E", accent2: "F59E0B" },
    Advisory: { bg: "28130A", accent: "F59E0B", card: "3A1F0A", accent2: "FDBA74" },
    Playful: { bg: "1A1A2E", accent: "FB7185", card: "2D2A4A", accent2: "34D399" },
  };
  const styleFont: Record<string, { head: string; body: string }> = {
    Professional: { head: "Calibri", body: "Calibri" },
    Journalistic: { head: "Georgia", body: "Calibri" },
    Technical: { head: "Consolas", body: "Calibri" },
    Narrative: { head: "Georgia", body: "Georgia" },
    "Bullet-brief": { head: "Calibri", body: "Calibri" },
  };
  const objectiveAccent: Record<string, string> = {
    Alert: "EF4444", Mobilize: "F59E0B", Persuade: "7C3AED", Inform: "14B8A6", Brief: "38BDF8",
  };
  const detailFont: Record<string, { title: number; bullet: number }> = {
    Brief: { title: 44, bullet: 20 },
    Standard: { title: 40, bullet: 18 },
    Detailed: { title: 36, bullet: 16 },
  };
  const t = toneMap[controls.tone] || toneMap.Analytical;
  const f = styleFont[controls.style] || styleFont.Professional;
  const d = detailFont[controls.detail] || detailFont.Standard;
  const accentOverride = objectiveAccent[controls.objective] ? objectiveAccent[controls.objective] : t.accent;
  // Language subtly shifts palette brightness
  const bg = controls.language === "Hinglish" ? "121E2E" : controls.language === "Hindi" ? "0F1F35" : t.bg;
  return { bg, accent: accentOverride, accent2: t.accent2, card: t.card, text: "FFFFFF", subtext: "D1E0F0", fontHead: f.head, fontBody: f.body, titleSize: d.title, bulletSize: d.bullet };
}

async function fetchImageBase64(prompt: string): Promise<string | null> {
  const safe = encodeURIComponent(prompt.slice(0, 180));
  const url = `https://image.pollinations.ai/p/${safe}?width=1024&height=768&nologo=true&model=flux`;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 8000) return null;
    return buf.toString("base64");
  } catch { return null; }
}

function cleanSourceText(s: string) {
  // Same garbage filter as normalize: drop PDF binary / worker-leak lines before topic/keyword use
  return s.split("\n").filter((l) => {
    const t = l.trim();
    if (/%PDF|endobj|endstream|xref|trailer|FlateDecode|\/Length|\/Filter|<<\//.test(t)) return false;
    if (/fake worker|Cannot find module|G:\\Projects|Gen-AI-Platform.*\.next|parse error/i.test(t)) return false;
    const symbols = (t.match(/[^a-zA-Z0-9\s.,;:!?'"()\-–—%$]/g) || []).length;
    if (t.length > 25 && symbols / t.length > 0.3) return false;
    return true;
  }).join("\n");
}

function stripInstructionPrefix(s: string) {
  // "tell me how bitcoin works Document bitcoin.pdf: ..." -> "bitcoin works"
  return s
    .replace(/^(tell me|please|kindly|create a summary of|create a presentation on|create|generate|summar(y|ize|ise)|explain)\s+/i, "")
    .replace(/\s*document\s+[\w\-.]+\.(pdf|pptx?|docx?)\s*:?\s*/i, " ")
    .replace(/^(of|on|about|how)\s+/i, "")
    .trim();
}

function extractTopicAndKeywords(bundle: SourceBundle): { topic: string; keywords: string } {
  const cleaned = cleanSourceText(bundle.text).replace(/\s+/g, " ").trim();
  const text = cleaned.slice(0, 4000);
  const rawFirst = text.split(/\. /)[0]?.slice(0, 180) || text.slice(0, 120);
  const stripped = stripInstructionPrefix(rawFirst);
  const topic = (stripped || rawFirst).slice(0, 120).trim() || "General Briefing";
  // Keywords = top frequent non-stopwords
  const stop = new Set(["the","is","are","was","were","and","or","for","with","this","that","from","have","has","will","would","your","you","their","there","which","when","what","how","about","into","through","over","under","a","an","of","to","in","on","by","as","at","it","its","be","been","being","we","our","us","they","them","i","my","me"]);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !stop.has(w));
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w]) => w);
  const keywords = top.length ? top.join(", ") : "policy, strategy, analysis, impact, stakeholders, implementation";
  return { topic, keywords };
}

// ── Schemas for each phase (constrained JSON) ──
const phase1Schema = {
  type: "object", additionalProperties: false, required: ["sections"],
  properties: {
    sections: {
      type: "array", minItems: 5, maxItems: 7,
      items: {
        type: "object", additionalProperties: false,
        required: ["sectionTitle", "description", "headline", "microCopy", "visualPrompt", "colorTheme", "designNotes"],
        properties: {
          sectionTitle: { type: "string" }, description: { type: "string" },
          headline: { type: "string" }, microCopy: { type: "array", items: { type: "string" } },
          visualPrompt: { type: "string" }, colorTheme: { type: "string" }, designNotes: { type: "string" },
        },
      },
    },
  },
};
const phase2Schema = {
  type: "object", additionalProperties: false, required: ["titleSlides"],
  properties: {
    titleSlides: {
      type: "array", minItems: 5, maxItems: 7,
      items: {
        type: "object", additionalProperties: false, required: ["headline", "summary"],
        properties: { headline: { type: "string" }, summary: { type: "string" } },
      },
    },
  },
};
const phase3Schema = {
  type: "object", additionalProperties: false, required: ["slides"],
  properties: {
    slides: {
      type: "array", minItems: 5, maxItems: 12,
      items: {
        type: "object", additionalProperties: false, required: ["sectionIndex", "bullets"],
        properties: { sectionIndex: { type: "number" }, bullets: { type: "array", items: { type: "string" } } },
      },
    },
  },
};
const phase4Schema = {
  type: "object", additionalProperties: false, required: ["notes"],
  properties: {
    notes: {
      type: "array", minItems: 5, maxItems: 12,
      items: {
        type: "object", additionalProperties: false, required: ["slideIndex", "speakerNotes"],
        properties: { slideIndex: { type: "number" }, speakerNotes: { type: "string" } },
      },
    },
  },
};
const phase5Schema = {
  type: "object", additionalProperties: false, required: ["title", "summary", "significance", "callToAction"],
  properties: {
    title: { type: "string" }, summary: { type: "string" },
    significance: { type: "array", items: { type: "string" } }, callToAction: { type: "string" },
  },
};
const phase6Schema = {
  type: "object", additionalProperties: false, required: ["coherence", "feedback", "recommendations"],
  properties: {
    coherence: { type: "string" },
    feedback: { type: "array", items: { type: "string" } },
    recommendations: { type: "array", items: { type: "string" } },
  },
};

// ── Generic Gemini caller with fallback ──
async function callGemini<T>(prompt: string, systemInstruction: string, schema: unknown, model: string, client: GoogleGenAI, fallback: T): Promise<{ data: T; used: boolean }> {
  try {
    const resp = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema: schema as never,
      },
    });
    const parsed = JSON.parse(resp.text ?? "{}") as T;
    // basic validation
    if (parsed && typeof parsed === "object") return { data: parsed, used: true };
  } catch { /* fallback */ }
  return { data: fallback, used: false };
}

function sourceSentences(bundle: SourceBundle): string[] {
  const cleaned = cleanSourceText(bundle.text).replace(/\s+/g, " ");
  return cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => stripInstructionPrefix(s.trim()))
    .filter((s) => {
      if (s.length < 40 || s.length > 240) return false;
      if (!/[a-zA-Z]{4,}/.test(s)) return false;
      const symbols = (s.match(/[^a-zA-Z0-9\s.,;:!?'"()\-–—%$]/g) || []).length;
      if (symbols / s.length > 0.2) return false; // reject "o !<#$jqxK1F 1xGL" style
      if (/Document\s+\S+\.pdf/i.test(s) && symbols > 5) return false;
      return true;
    });
}

// Expand thin bullets (single words like "bitcoin") into full sentences from source
function enrichBullets(bullets: string[], bundle: SourceBundle, topic: string): string[] {
  const sentences = sourceSentences(bundle);
  return bullets.map((b, i) => {
    const words = b.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 8 && b.length >= 40) return b; // already substantial
    const pick = sentences[i % Math.max(1, sentences.length)] || sentences[0];
    if (pick) {
      // If bullet is a keyword, anchor it to a real sentence
      if (words.length <= 3) return `${b.replace(/^[•\-–\s]+/, "").trim()} — ${pick.slice(0, 140)}`.slice(0, 160);
      return `${b.trim()} — ${pick.slice(0, 110)}`.slice(0, 160);
    }
    // Last resort: topic-anchored sentence, never a bare word
    return `${b.trim()} shapes ${topic.slice(0, 60)} for real-world use`.slice(0, 160);
  });
}

function fallbackPhase1(topic: string, keywords: string, controls: TransformControls): Phase1Out {
  const kwList = keywords.split(",").map((k) => k.trim()).filter(Boolean);
  const k0 = kwList[0] || topic;
  const k1 = kwList[1] || "core mechanisms";
  const k2 = kwList[2] || "real-world impact";
  return {
    sections: [
      { sectionTitle: "Opening & Framing", description: `Set context for ${topic} with ${kwList.slice(0, 4).join(" • ")}`, headline: topic.slice(0, 48), microCopy: [`${topic} explained clearly for ${controls.audience}`, `${controls.objective} through ${k0} and ${k1}`], visualPrompt: "hero full-bleed, soft volumetric light, teal-slate color grading, editorial composition", colorTheme: `${controls.tone} + ${controls.style} — slate/teal`, designNotes: "Inter 800 + Inter 400, accent #14B8A6" },
      { sectionTitle: "Context & Background", description: `Why ${topic} matters now, using ${keywords}`, headline: "Context: Why It Matters Now", microCopy: [`${k0} defines why ${topic} matters for ${controls.audience}`, `Current momentum around ${k1} makes this timely`], visualPrompt: "asymmetric split, cinematic rim light, layered depth, cool-slate grading", colorTheme: "slate/teal", designNotes: "Generous whitespace, 28/12 pairing" },
      { sectionTitle: "Key Insights", description: `Core ideas behind ${topic}`, headline: "Key Insights", microCopy: [`${k0} drives how ${topic} actually works`, `${k1} determines ${k2} in practice`, `What ${controls.audience} must get right about ${topic}`], visualPrompt: "data visualization, studio lighting, balanced composition, teal accent", colorTheme: "slate/teal", designNotes: "Asymmetric split, tight leading" },
      { sectionTitle: "Implications", description: `Impact of ${topic} on ${controls.audience}`, headline: "Implications", microCopy: [`${topic} changes decisions for ${controls.audience} this year`, `Ignoring ${k0} carries real cost and missed opportunity`], visualPrompt: "implications arrow, top-light, open composition", colorTheme: "slate/amber", designNotes: "Whitespace, bold headline" },
      { sectionTitle: "Recommendations", description: `Next steps for ${controls.audience}`, headline: "Recommendations", microCopy: [`Brief ${controls.audience} on ${k0} before acting`, `Track ${k1} and review ${k2} quarterly`], visualPrompt: "checklist, soft studio light, minimal palette", colorTheme: "teal/slate", designNotes: "Checklist style" },
      { sectionTitle: "Closing", description: `Wrap ${topic}`, headline: "Closing & Next Steps", microCopy: [`${topic} in one line: ${k0} enables ${k2}`, `Open discussion for ${controls.audience}`], visualPrompt: "closing dark slate, centered, generous padding", colorTheme: "slate/teal", designNotes: "Centered, minimal" },
    ].slice(0, 6),
  };
}

// ── PPT builder — theme changes per controls, bigger fonts, real images ──
async function buildPptxBase64(slides: Slide[], deckTitle: string, controls: TransformControls): Promise<string> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Content Forge";
  pptx.title = deckTitle;
  pptx.company = "SIH PS 26154 — NTRO";
  const theme = themeFor(controls);
  const W = 13.33, H = 7.5;

  // Images are best-effort and NEVER block text: fetch with per-slide catch,
  // cohesive deck anchor so slides look related, no faces/text.
  const styleAnchor = `${controls.style} flat vector editorial illustration, ${theme.accent} and ${theme.bg} palette, soft studio lighting, balanced 16:9 composition, minimalist, no human faces, no text, no watermark, 8k`;
  const deckAnchor = `about ${deckTitle.slice(0, 60)}`;
  const imageResults: (string | null)[] = await Promise.all(slides.map(async (s) => {
    try {
      const core = s.visualDirection.replace(/human|woman|man|face|portrait|person/gi, "abstract concept").slice(0, 120);
      const p = `${core} ${deckAnchor}, ${styleAnchor}`;
      return await fetchImageBase64(p);
    } catch { return null; }
  }));

  pptx.defineSlideMaster({ title: "FORGE_MASTER", background: { color: theme.bg }, objects: [{ rect: { x: 0, y: 0, w: W, h: 0.12, fill: { color: theme.accent } } }] });

  for (let idx = 0; idx < slides.length; idx++) {
    const s = slides[idx];
    const isFullBleed = s.layoutConcept.toLowerCase().includes("full-bleed");
    const isSplit = s.layoutConcept.toLowerCase().includes("asymmetric") || s.layoutConcept.toLowerCase().includes("split");
    const slide = pptx.addSlide({ masterName: "FORGE_MASTER" });
    const imgB64 = imageResults[idx];
    // keep image for later use
    (s as Slide).imageBase64 = imgB64 || undefined;

    // CLEAN SLIDES: title + bullets + image only. No shadows/transparency
    // (those props blanked slides in PowerPoint). Text always renders.
    const title = stripMd(s.title) || `Slide ${s.n}`;
    const micro = s.bullets.map((b) => `•  ${stripMd(b)}`).join("\n\n");
    if (isFullBleed) {
      if (imgB64) {
        try { slide.addImage({ data: `data:image/jpeg;base64,${imgB64}`, x: 0, y: 0.12, w: W, h: H - 0.12, sizing: { type: "cover", w: W, h: H - 0.12 } } as never); } catch { /* text still renders below */ }
        slide.addShape("rect" as never, { x: 0, y: 0.12, w: W, h: H - 0.12, fill: { color: "0A1628" } } as never);
      } else {
        slide.addShape("rect" as never, { x: 0, y: 0.12, w: W, h: H - 0.12, fill: { color: "0A1628" } } as never);
      }
      slide.addText(title, { x: 0.8, y: 0.7, w: 11.7, h: 1.0, fontSize: theme.titleSize, color: "FFFFFF", bold: true, fontFace: theme.fontHead });
      slide.addText(micro, { x: 0.8, y: 1.9, w: 7.5, h: 3.6, fontSize: theme.bulletSize, color: "E6EEF9", fontFace: theme.fontBody });
    } else if (isSplit) {
      slide.addText(title, { x: 0.6, y: 0.35, w: 7.2, h: 0.9, fontSize: theme.titleSize - 2, color: "FFFFFF", bold: true, fontFace: theme.fontHead });
      slide.addText(micro, { x: 0.6, y: 1.35, w: 7.2, h: 4.9, fontSize: theme.bulletSize, color: "E6EEF9", fontFace: theme.fontBody, valign: "top" });
      if (imgB64) {
        try { slide.addImage({ data: `data:image/jpeg;base64,${imgB64}`, x: 8.4, y: 0.9, w: 4.3, h: 5.2, sizing: { type: "cover", w: 4.3, h: 5.2 } } as never); } catch {
          slide.addShape("roundRect" as never, { x: 8.4, y: 0.9, w: 4.3, h: 5.2, fill: { color: theme.card }, rectRadius: 0.18, line: { color: theme.accent, width: 1.5 } } as never);
          slide.addText(`${s.n}`, { x: 8.4, y: 2.6, w: 4.3, h: 1.2, fontSize: 72, color: theme.accent, bold: true, fontFace: theme.fontHead, align: "center" });
        }
      } else {
        slide.addShape("roundRect" as never, { x: 8.4, y: 0.9, w: 4.3, h: 5.2, fill: { color: theme.card }, rectRadius: 0.18, line: { color: theme.accent, width: 1.5 } } as never);
        slide.addText(`${s.n}`, { x: 8.4, y: 2.6, w: 4.3, h: 1.2, fontSize: 72, color: theme.accent, bold: true, fontFace: theme.fontHead, align: "center" });
      }
    } else {
      slide.addText(title, { x: 1.2, y: 0.8, w: 10.9, h: 1.0, fontSize: theme.titleSize, color: "FFFFFF", bold: true, fontFace: theme.fontHead, align: "center" });
      slide.addText(micro, { x: 1.8, y: 2.0, w: 9.7, h: 3.4, fontSize: theme.bulletSize, color: "E6EEF9", fontFace: theme.fontBody, align: "center", valign: "top" });
      if (imgB64) {
        try { slide.addImage({ data: `data:image/jpeg;base64,${imgB64}`, x: 3.9, y: 5.4, w: 5.5, h: 1.3, sizing: { type: "cover", w: 5.5, h: 1.3 } } as never); } catch { /* skip */ }
      }
    }
    slide.addNotes(stripMd(s.notes).slice(0, 800));
    slide.addText(`${s.n} / ${slides.length}`, { x: W - 1.1, y: H - 0.32, w: 0.8, h: 0.2, fontSize: 9, color: "8AA0BE", align: "right", fontFace: theme.fontBody });
  }
  const base64 = (await pptx.write({ outputType: "base64" })) as string;
  if (!base64.startsWith("UEsDB")) throw new Error("PPTX base64 header invalid");
  return base64;
}

// ── Main: 6-Phase Chain ──
export async function generatePresentation(bundle: SourceBundle, controls: TransformControls): Promise<Artefact> {
  const warnings: string[] = [];
  const { topic, keywords } = extractTopicAndKeywords(bundle);
  const deckTitle = digestibleTitle(bundle, controls);
  const fileName = digestibleName(bundle, controls);

  // Global params string for every phase
  const globals = `- Topic: [${topic}]
- Keywords: [${keywords}]
- Audience: [${controls.audience}]
- Tone: [${controls.tone}]
- Language: [${controls.language}]
- Detail: [${controls.detail}]
- Objective: [${controls.objective}]
- Style: [${controls.style}]`;

  let slides: Slide[] = [];
  let geminiUsed = false;

  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

      // Phase 1: Content Strategist
      const p1Fallback = fallbackPhase1(topic, keywords, controls);
      const p1 = await callGemini<Phase1Out>(
        `You are a Presentation Content Strategist. Follow these steps:
1. Use [TOPIC]=[${topic}] to determine subject, incorporating global params.
2. Create 5-7 sections. Each section: a) sectionTitle, b) description elaborating purpose using [KEYWORDS]=[${keywords}], c) Aesthetic Copywriting & Sizing: punchy headline (4-8 words) + micro-copy as 2-3 FULL sentences of 12-22 words each with specific facts from the source — NEVER single words like "bitcoin" alone, always explain, tone [${controls.tone}], d) Visual Generation & Image Prompts: detailed composition/lighting/color grading WITHOUT people faces, e) Dynamic Color Theme per tone/style, f) Design Notes: typography pairing + palette.
Present as structured slide-by-slide blueprint.

Global params:
${globals}

Source briefing:
${bundle.text.slice(0, 7000)}`,
        `You are Presentation Content Strategist. Return JSON only per schema. Language ${controls.language}. Every bullet must be a complete informative sentence. No markdown symbols, no single-word bullets.`,
        phase1Schema, model, client, p1Fallback
      );
      if (p1.used) geminiUsed = true; else warnings.push("Phase 1 fallback used");

      // Phase 2: Slide Designer
      const p2Fallback: Phase2Out = { titleSlides: p1.data.sections.map((s) => ({ headline: s.headline, summary: s.description.slice(0, 120) })) };
      const p2 = await callGemini<Phase2Out>(
        `You are a Presentation Slide Designer. Review main sections from Phase 1 and create title slide for each section (headline + brief summary of key points/objectives). Must remain relevant to [TOPIC]=[${topic}] and consistent with theme.

Global params:
${globals}

Sections:
${JSON.stringify(p1.data.sections.map((s) => s.sectionTitle))}

Return JSON titleSlides[].`,
        `You are Presentation Slide Designer. Return JSON only. Language ${controls.language}.`,
        phase2Schema, model, client, p2Fallback
      );

      // Phase 3: Slide Content Developer
      const p3Fallback: Phase3Out = { slides: p1.data.sections.map((s, i) => ({ sectionIndex: i, bullets: s.microCopy.slice(0, 3) })) };
      const p3 = await callGemini<Phase3Out>(
        `You are Slide Content Developer. For each slide/section, develop EXACTLY 3 bullets. Each bullet MUST be a complete sentence of 14-24 words with concrete facts from the source, directly referencing [KEYWORDS]=[${keywords}]. FORBIDDEN: single words, fragments, or bullets under 8 words. Example good bullet: "Bitcoin miners validate blocks roughly every ten minutes, securing the ledger without banks." Example BAD: "bitcoin".

Global params:
${globals}

Sections: ${JSON.stringify(p1.data.sections.map((s) => ({ title: s.sectionTitle, kw: keywords })))}`,
        `You are Slide Content Developer. Return JSON only. Language ${controls.language}. Every bullet 14-24 words, full sentences only.`,
        phase3Schema, model, client, p3Fallback
      );

      // Phase 4: Speaker Note Specialist
      const p4Fallback: Phase4Out = { notes: p1.data.sections.map((_, i) => ({ slideIndex: i, speakerNotes: `Elaboration for slide ${i + 1} on ${topic} — ${keywords.split(",")[0]}` })) };
      const p4 = await callGemini<Phase4Out>(
        `You are Presentation Speaker Note Specialist. Review slide content and generate speaker notes per slide: a) additional context, b) brief concept explanation, c) anchor back to [TOPIC]=[${topic}] and [KEYWORDS]=[${keywords}].

Global params:
${globals}

Slides bullets: ${JSON.stringify(p3.data.slides)}`,
        `You are Speaker Note Specialist. Return JSON only. Language ${controls.language}.`,
        phase4Schema, model, client, p4Fallback
      );

      // Phase 5: Conclusion Specialist
      const p5Fallback: Phase5Out = { title: "In Conclusion", summary: `Wrap up ${topic} — ${keywords}`, significance: [`${topic} matters for ${controls.audience}`, "Key takeaways synthesized"], callToAction: `What will ${controls.audience} do next about ${topic}?` };
      const p5 = await callGemini<Phase5Out>(
        `You are Presentation Conclusion Specialist for [TOPIC]=[${topic}]. Create closing slide: 1) Title (e.g. Final Thoughts), 2) Summary encapsulating main themes, 3) Re-emphasis significance, 4) Call to action/question. Format: Section1 Title, Section2 Summary, Section3 Key Significance Points, Section4 Call to Action.

Global params:
${globals}

Keywords: [${keywords}]`,
        `You are Conclusion Specialist. Return JSON only. Language ${controls.language}.`,
        phase5Schema, model, client, p5Fallback
      );

      // Phase 6: QA Specialist (review but also refine slides)
      const p6Fallback: Phase6Out = { coherence: "Outline coherent, flow logical", feedback: ["Clear hierarchy"], recommendations: ["Ensure tone consistency"] };
      const p6 = await callGemini<Phase6Out>(
        `You are Presentation Quality Assurance Specialist. Review entire presentation: 1) coherence/flow, 2) refine content/notes for clarity/consistency, 3) alignment with objectives/audience, 4) recommendations.

Global params:
${globals}

Topic related slides: ${JSON.stringify(p1.data.sections.map((s) => s.sectionTitle))}`,
        `You are QA Specialist. Return JSON only. Language ${controls.language}.`,
        phase6Schema, model, client, p6Fallback
      );
      if (!p6.used) warnings.push("Phase 6 fallback used");

      // Assemble final 8-12 slides from chain — enrich thin bullets with source sentences
      const sections = p1.data.sections;
      slides = sections.map((sec, i) => {
        const raw = p3.data.slides.find((s) => s.sectionIndex === i)?.bullets || sec.microCopy;
        const enriched = enrichBullets(raw.map((b) => clean(b)), bundle, topic).slice(0, 3);
        const note = p4.data.notes.find((n) => n.slideIndex === i)?.speakerNotes || `Notes for ${sec.sectionTitle}`;
        const titleSlide = p2.data.titleSlides[i];
        return {
          n: i + 1,
          title: clean(titleSlide?.headline || sec.headline).slice(0, 64) || sec.sectionTitle,
          bullets: enriched,
          notes: clean(note).slice(0, 800),
          layoutConcept: clean(sec.visualPrompt).includes("full-bleed") ? "full-bleed imagery with overlay" : i % 2 === 0 ? "asymmetric split — left copy, right visual" : "generous whitespace — centered headline",
          visualDirection: clean(sec.visualPrompt).slice(0, 220),
          designNotes: clean(`${sec.colorTheme} — ${sec.designNotes}`).slice(0, 180),
        };
      });

      // Append conclusion slide as final
      slides.push({
        n: slides.length + 1,
        title: clean(p5.data.title).slice(0, 64) || "In Conclusion",
        bullets: [...p5.data.significance.map((s) => clean(s)), clean(p5.data.callToAction)].slice(0, 4),
        notes: clean(p5.data.summary).slice(0, 800),
        layoutConcept: "generous whitespace — centered headline",
        visualDirection: `conclusion visual for ${topic}, ${controls.style}, ${controls.tone} — editorial, cohesive`,
        designNotes: `Typography: Inter 800/400, accent ${sections[0]?.colorTheme || "#14B8A6"}`,
      });

      // QA coherence goes to warnings if needed (not blocking)
      if (p6.data.recommendations.length) warnings.push(`QA: ${p6.data.recommendations.slice(0, 2).join("; ").slice(0, 120)}`);

      // Ensure 8-12 slides: pad or trim
      if (slides.length < 8) {
        while (slides.length < 8) {
          const last = slides[slides.length - 1];
          slides.push({ ...last, n: slides.length + 1, title: `${last.title} (cont.)` });
        }
      }
      slides = slides.slice(0, 12).map((s, i) => ({ ...s, n: i + 1 }));

    } catch (e) {
      warnings.push(`Prompt chain failed: ${(e as Error).message.slice(0, 120)} — using fallback`);
      slides = fallbackPhase1(topic, keywords, controls).sections.map((sec, i) => ({
        n: i + 1, title: sec.headline, bullets: sec.microCopy, notes: sec.description.slice(0, 300),
        layoutConcept: i % 2 === 0 ? "asymmetric split — left copy, right visual" : "generous whitespace — centered headline",
        visualDirection: sec.visualPrompt, designNotes: sec.designNotes,
      }));
    }
  } else {
    warnings.push("GEMINI_API_KEY not set — running 6-phase chain in deterministic fallback");
    const p1 = fallbackPhase1(topic, keywords, controls);
    slides = p1.sections.map((sec, i) => ({
      n: i + 1, title: sec.headline, bullets: sec.microCopy, notes: sec.description.slice(0, 300),
      layoutConcept: i % 2 === 0 ? "asymmetric split — left copy, right visual" : "generous whitespace — centered headline",
      visualDirection: sec.visualPrompt, designNotes: sec.designNotes,
    }));
    // add conclusion
    slides.push({ n: slides.length + 1, title: "In Conclusion", bullets: [`${topic} — ${keywords.split(",")[0]}`, "Next steps for " + controls.audience], notes: `Conclusion for ${topic}`, layoutConcept: "generous whitespace — centered headline", visualDirection: "conclusion editorial", designNotes: "Inter 800/400" });
  }

  // Build PPTX — theme + images per controls, bigger fonts
  let pptxBase64: string | undefined;
  try { pptxBase64 = await buildPptxBase64(slides, deckTitle, controls); } catch (e) { warnings.push(`PPTX build failed: ${(e as Error).message}`); }

  const body = slides.map((s) => `Slide ${s.n}: ${s.title}
Layout: ${s.layoutConcept}
Copy:
${s.bullets.map((b) => `  • ${b}`).join("\n")}
Visual: ${s.visualDirection}
Design: ${s.designNotes}
Notes: ${s.notes}`).join("\n\n") + (pptxBase64 ? `\n\nPPTX ready — ${fileName} — download below.` : "");

  return {
    type: "Presentation",
    title: deckTitle,
    body,
    metadata: {
      slides, slideCount: slides.length, topic, keywords,
      provider: warnings.some((w) => w.includes("fallback")) ? "fallback" : "gemini-chain",
      model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
      pptxBase64, pptxFileName: fileName,
      phases: 6,
    },
    warnings,
    confidence: geminiUsed ? 90 : 72,
  };
}
