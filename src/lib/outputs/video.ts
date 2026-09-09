import { GoogleGenAI } from "@google/genai";
import type { Artefact, SourceBundle, TransformControls } from "../types";

type VideoJson = { script: string; scenes: { visual: string; duration: string; transition: string; caption: string }[]; narration: string; srt: string };

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["script", "scenes", "narration", "srt"],
  properties: {
    script: { type: "string" },
    scenes: {
      type: "array", minItems: 4, maxItems: 8,
      items: { type: "object", additionalProperties: false, required: ["visual", "duration", "transition", "caption"], properties: { visual: { type: "string" }, duration: { type: "string" }, transition: { type: "string" }, caption: { type: "string" } } },
    },
    narration: { type: "string" },
    srt: { type: "string" },
  },
};

function fallback(c: TransformControls, src: string): VideoJson {
  const toneAdj = c.tone === "Playful" ? "upbeat" : c.tone === "Formal" ? "measured" : c.tone === "Advisory" ? "authoritative" : "analytical";
  return {
    script: `[${toneAdj}, ${c.language}, for ${c.audience}] ${src.slice(0, 340)} — objective: ${c.objective}, style: ${c.style}.`,
    scenes: [
      { visual: `Opening — ${c.tone} title for ${c.audience}`, duration: "5s", transition: "fade", caption: "Title card" },
      { visual: "Context montage — archival", duration: "10s", transition: "cut", caption: src.slice(0, 80) },
      { visual: "Key finding — data overlay", duration: "8s", transition: "wipe", caption: src.slice(80, 160) },
      { visual: `Closing CTA — ${c.audience}`, duration: "7s", transition: "fade", caption: "CTA" },
    ],
    narration: src.slice(0, 260) + ` [${c.language}]`,
    srt: `1\n00:00:00,000 --> 00:00:05,000\n${src.slice(0, 70)}\n\n2\n00:00:05,000 --> 00:00:12,000\n${src.slice(70, 140)}\n`,
  };
}

export async function generateVideo(bundle: SourceBundle, controls: TransformControls): Promise<Artefact> {
  const src = bundle.text.slice(0, 3000).replace(/\s+/g, " ").trim();
  let data: VideoJson = fallback(controls, src);
  const warnings: string[] = [];
  let geminiUsed = false;

  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
      const resp = await client.models.generateContent({
        model,
        contents: `Source:\n${src.slice(0, 5000)}\n\nAudience: ${controls.audience}\nTone: ${controls.tone}\nLanguage: ${controls.language}\nDetail: ${controls.detail}\nObjective: ${controls.objective}\nStyle: ${controls.style}\n\nGenerate video JSON: script (30-90s read), 4-8 scenes {visual (B-roll prompt), duration 4-12s, transition, caption}, narration (voiceover text), srt (2-4 cues). Visuals must match tone/style. Language=${controls.language}, for ${controls.audience}.`,
        config: {
          systemInstruction: `You are Content Forge video packager. Respect tone/language/detail/objective/style/audience. Write narration in ${controls.language}. Return JSON only.`,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
        },
      });
      const parsed = JSON.parse(resp.text ?? "{}") as VideoJson;
      if (parsed.script && Array.isArray(parsed.scenes) && parsed.scenes.length >= 4) {
        data = { script: parsed.script.slice(0, 3000), scenes: parsed.scenes.slice(0, 8), narration: (parsed.narration || "").slice(0, 1500), srt: (parsed.srt || data.srt).slice(0, 2000) };
        geminiUsed = true;
      }
    } catch {
      warnings.push("Gemini Video failed — using fallback pack");
    }
  } else {
    warnings.push("GEMINI_API_KEY not set — Video uses deterministic template");
  }

  if (!process.env.ELEVENLABS_API_KEY) warnings.push("Audio requires ELEVENLABS_API_KEY — script/storyboard/SRT provided without mp3");
  const audioNote = process.env.ELEVENLABS_API_KEY ? "ElevenLabs narration available — call /v1/text-to-speech" : "No audio — set ELEVENLABS_API_KEY for mp3";

  const visualRecs = data.scenes.map((s) => `${s.visual} (${s.duration}, ${s.transition}) — ${s.caption}`).join("\n") + `\nTone visuals: ${controls.tone}, Style: ${controls.style}, Palette adapts to tone.`;

  const body = `## Script (${controls.tone}, ${controls.language}, for ${controls.audience})\n${data.script}\n\n## Storyboard\n${data.scenes.map((s, i) => `${i + 1}. ${s.visual} — ${s.duration} — ${s.transition}\n   Caption: ${s.caption}`).join("\n")}\n\n## Narration\n${data.narration}\n\n## Subtitles (SRT)\n\`\`\`srt\n${data.srt}\n\`\`\`\n\n## Visual Recommendations\n${visualRecs}\n\n*Audio: ${audioNote}*`;

  return {
    type: "Video",
    title: `Video Package — for ${controls.audience}`,
    body,
    metadata: { script: data.script, storyboard: data.scenes, srt: data.srt, narration: data.narration, audioUrl: process.env.ELEVENLABS_API_KEY ? "elevenlabs://pending" : undefined, visualRecs, tone: controls.tone, language: controls.language },
    warnings,
    confidence: geminiUsed ? 82 : 60,
  };
}
