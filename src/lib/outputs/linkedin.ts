import { GoogleGenAI } from "@google/genai";
import type { Artefact, SourceBundle, TransformControls } from "../types";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["hook", "body", "takeaway", "hashtags"],
  properties: {
    hook: { type: "string" },
    body: { type: "string" },
    takeaway: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
  },
};

function toneMap(t: TransformControls["tone"]) {
  return {
    Analytical: "precise, data-driven, no hype — lead with insight, use measured language",
    Conversational: "warm, direct, as if explaining to a smart colleague over coffee",
    Formal: "respectful, polished, suitable for senior officials — avoid slang",
    Persuasive: "confident, compelling, clear CTA — make the reader feel the stakes",
    Advisory: "directive, responsible, risk-aware — give clear guidance",
    Playful: "light, witty but still credible — one clever line max",
  }[t];
}
function styleMap(s: TransformControls["style"]) {
  return {
    Professional: "crisp headings, short paragraphs, LinkedIn-native formatting",
    Journalistic: "inverted pyramid, fact-first, quote-ready",
    Technical: "use precise terms, define acronyms, include nuance",
    Narrative: "open with a human moment, then unfold",
    "Bullet-brief": "ultra-scannable — 3 bullets max, 18 words each",
  }[s];
}

function fallback(bundle: SourceBundle, c: TransformControls) {
  const src = bundle.text.slice(0, 900).replace(/\s+/g, " ").trim();
  const detailLen = c.detail === "Brief" ? 2 : c.detail === "Detailed" ? 5 : 3;
  const sentences = src.split(/\. /).slice(0, detailLen).join(". ");
  const hooks: Record<string, string> = {
    Analytical: `Analysis: What ${sentences.slice(0, 70)}… means for ${c.audience}.`,
    Conversational: `Here's what stood out to me about ${sentences.slice(0, 60)}… — especially for ${c.audience}.`,
    Formal: `We share a briefing on ${sentences.slice(0, 60)}… for ${c.audience}.`,
    Persuasive: `If you work with ${c.audience}, this changes your next move: ${sentences.slice(0, 70)}…`,
    Advisory: `Attention ${c.audience}: Key update on ${sentences.slice(0, 60)}…`,
    Playful: `Not your usual update on ${sentences.slice(0, 55)}… — quick take for ${c.audience}:`,
  };
  const hook = hooks[c.tone] || hooks.Analytical;
  const bodyByStyle: Record<string, string> = {
    Professional: sentences.slice(0, 420),
    Journalistic: `${sentences.slice(0, 320)}\n\nWhy it matters: ${c.objective} for ${c.audience}.`,
    Technical: `${sentences.slice(0, 380)}\n\nScope: ${c.detail} • Language: ${c.language}`,
    Narrative: `Last week, teams working with ${c.audience} faced: ${sentences.slice(0, 340)}`,
    "Bullet-brief": `• ${sentences.slice(0, 110)}\n• ${sentences.slice(110, 220)}\n• Takeaway for ${c.audience}`,
  };
  const body = bodyByStyle[c.style] || bodyByStyle.Professional;
  const takeaways: Record<string, string> = {
    Inform: `Bottom line for ${c.audience}: stay informed, share with your team.`,
    Persuade: `If this resonates, bring it to your next review — ${c.audience} should act this week.`,
    Alert: `Recommended: review exposure and brief stakeholders within 24h.`,
    Mobilize: `Next step: identify two owners in ${c.audience} and assign follow-up.`,
    Brief: `TL;DR — ${sentences.slice(0, 90)}`,
    Credibility: `Source-checked briefing — suitable to forward to ${c.audience}.`,
  };
  const takeaway = takeaways[c.objective] || `Open question for ${c.audience}: how would you apply this?`;
  const hashtags = c.style === "Bullet-brief" ? ["#Brief", "#ContentForge"] : ["#ContentForge", "#SIH2025", `#${c.tone}`];
  // Language handling fallback (deterministic): if Hindi, transliterate hook hint
  const langNote = c.language === "Hindi" ? "\n\n[भाषा: हिंदी — AI live will render fully in Hindi; fallback shows English structure]" : c.language === "Hinglish" ? "\n\n[ Hinglish mix — AI live will blend Hindi + English ]" : "";
  return { hook, body: body + langNote, takeaway, hashtags };
}

export async function generateLinkedIn(bundle: SourceBundle, controls: TransformControls): Promise<Artefact> {
  const warnings: string[] = [];
  let data = fallback(bundle, controls);
  let geminiUsed = false;

  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
      const resp = await client.models.generateContent({
        model,
        contents: `Source:\n${bundle.text.slice(0, 6000)}\n\nAudience: ${controls.audience}\nTone: ${controls.tone} (${toneMap(controls.tone)})\nLanguage: ${controls.language}\nDetail: ${controls.detail} (${controls.detail === "Brief" ? "180-280 words" : controls.detail === "Detailed" ? "450-600 words" : "300-420 words"})\nObjective: ${controls.objective}\nStyle: ${controls.style} (${styleMap(controls.style)})\n\nGenerate LinkedIn JSON. Hook: 12-18 words. Body: follow style/tone, language=${controls.language}. Takeaway: 1 sentence CTA tailored to audience/objective. Hashtags: 3-5.`,
        config: {
          systemInstruction: `You are Content Forge LinkedIn writer. Respect audience/tone/language/detail/objective/style exactly. Write in ${controls.language}. Return JSON only.`,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
        },
      });
      const parsed = JSON.parse(resp.text ?? "{}") as typeof data;
      if (parsed.hook && parsed.body) {
        data = { hook: parsed.hook.slice(0, 220), body: parsed.body.slice(0, 4000), takeaway: parsed.takeaway?.slice(0, 300) || data.takeaway, hashtags: (parsed.hashtags || data.hashtags).slice(0, 5) };
        geminiUsed = true;
      }
    } catch {
      warnings.push("Gemini LinkedIn failed — using control-aware fallback");
    }
  } else {
    warnings.push("GEMINI_API_KEY not set — LinkedIn uses deterministic, control-aware template");
  }

  const clean = (s: string) => s.replace(/\*\*/g, "").replace(/�/g, "").replace(/[^\x09\x0A\x0D\x20-\x7E\u0900-\u097F\u00A0-\u00FF\n]/g, " ").trim();
  const body = `Hook: ${clean(data.hook)}\n\n${clean(data.body)}\n\nTakeaway: ${clean(data.takeaway)}\n\n${data.hashtags.join(" ")}`;
  const title = clean(data.hook).slice(0, 64).replace(/\s+/g, " ").trim() || `LinkedIn — for ${controls.audience}`;
  return { type: "LinkedIn", title, body, metadata: { hook: data.hook, hashtags: data.hashtags, tone: controls.tone, style: controls.style, language: controls.language, audience: controls.audience }, warnings, confidence: geminiUsed ? 84 : 72 };
}
