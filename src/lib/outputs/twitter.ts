import { GoogleGenAI } from "@google/genai";
import type { Artefact, SourceBundle, TransformControls } from "../types";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["tweets"],
  properties: {
    tweets: { type: "array", minItems: 1, maxItems: 8, items: { type: "string" } },
  },
};

function tweetFallback(bundle: SourceBundle, c: TransformControls): string[] {
  const src = bundle.text.slice(0, 900).replace(/\s+/g, " ").trim();
  const tonePrefix: Record<string, string> = {
    Analytical: "Analysis:",
    Conversational: "Quick take:",
    Formal: "Briefing:",
    Persuasive: "Heads up:",
    Advisory: "Advisory:",
    Playful: "Hot take:",
  };
  const prefix = tonePrefix[c.tone] || "Update:";
  const langHint = c.language !== "English" ? ` [${c.language}]` : "";
  if (c.detail === "Brief") {
    return [`${prefix}${langHint} ${src.slice(0, 180)}`];
  }
  const count = c.detail === "Detailed" ? 6 : 4;
  const chunks = [src.slice(0, 180), src.slice(180, 360), src.slice(360, 540), src.slice(540, 720), src.slice(720, 900), "For " + c.audience + " — objective: " + c.objective + ", style: " + c.style].slice(0, count);
  return chunks.map((t, i) => `${i + 1}/${count} ${prefix}${langHint} ${t}`.slice(0, 278));
}

export async function generateTwitter(bundle: SourceBundle, controls: TransformControls): Promise<Artefact> {
  let tweets = tweetFallback(bundle, controls);
  const warnings: string[] = [];
  let geminiUsed = false;

  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
      const detailInstr = controls.detail === "Brief" ? "Single tweet, 220-270 chars" : controls.detail === "Detailed" ? "6-8 tweet thread" : "4-5 tweet thread";
      const resp = await client.models.generateContent({
        model,
        contents: `Source:\n${bundle.text.slice(0, 5000)}\n\nAudience: ${controls.audience}\nTone: ${controls.tone}\nLanguage: ${controls.language}\nDetail: ${controls.detail} → ${detailInstr}\nObjective: ${controls.objective}\nStyle: ${controls.style}\n\nGenerate tweets array. Each tweet ≤278 chars, thread numbering like 1/4, language=${controls.language}, tone=${controls.tone}, for ${controls.audience}.`,
        config: {
          systemInstruction: `You are Content Forge X writer. Respect tone/language/detail/objective/style/audience. Write in ${controls.language}. Return JSON only.`,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
        },
      });
      const parsed = JSON.parse(resp.text ?? "{}") as { tweets?: string[] };
      if (Array.isArray(parsed.tweets) && parsed.tweets.length) {
        tweets = parsed.tweets.slice(0, 8).map((t) => t.slice(0, 278));
        geminiUsed = true;
      }
    } catch {
      warnings.push("Gemini X failed — using fallback thread");
    }
  } else {
    warnings.push("GEMINI_API_KEY not set — X uses deterministic thread");
  }

  const cleanTweets = tweets.map((t) => t.replace(/�/g, "").replace(/[^\x09\x0A\x0D\x20-\x7E\u0900-\u097F\u00A0-\u00FF\n]/g, " "));
  const body = cleanTweets.join("\n\n");
  const title = cleanTweets[0]?.slice(0, 48) || `X — for ${controls.audience}`;
  return { type: "Twitter", title, body, metadata: { tweets: cleanTweets, count: cleanTweets.length, tone: controls.tone, language: controls.language }, warnings, confidence: geminiUsed ? 83 : 70 };
}
