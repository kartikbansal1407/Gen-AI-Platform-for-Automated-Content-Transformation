import { GoogleGenAI } from "@google/genai";
import type { Artefact, SourceBundle, TransformControls } from "../types";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "background", "assessment", "recommendations"],
  properties: {
    title: { type: "string" }, summary: { type: "string" }, background: { type: "string" }, assessment: { type: "string" },
    recommendations: { type: "array", items: { type: "string" } },
  },
};

function advisoryFallback(bundle: SourceBundle, c: TransformControls) {
  const src = bundle.text.slice(0, 4000);
  const toneLine = c.tone === "Advisory" ? "This advisory is directive — act as recommended." : c.tone === "Formal" ? "This advisory is issued with due diligence." : `Tone: ${c.tone}`;
  const langNote = c.language !== "English" ? ` (Language: ${c.language})` : "";
  return {
    title: `ADVISORY — ${c.audience}${langNote}`,
    summary: src.slice(0, c.detail === "Brief" ? 220 : c.detail === "Detailed" ? 900 : 480) || "Summary from source",
    background: src.slice(c.detail === "Brief" ? 220 : 480, c.detail === "Brief" ? 520 : 1400) || "Background from source",
    assessment: `${toneLine} Style ${c.style}, objective ${c.objective}, detail ${c.detail}. ${src.slice(1400, 1900)}`,
    recommendations: c.objective === "Alert" ? ["Review exposure immediately", "Brief leadership within 24h", "Monitor indicators daily"] : c.objective === "Mobilize" ? ["Assign owners in " + c.audience, "Schedule execution within 48h"] : ["Disseminate to " + c.audience, "Monitor for follow-up indicators"],
  };
}

function clean(s: string) {
  return s.replace(/\*\*/g, "").replace(/__+/g, "").replace(/^#+\s*/gm, "").replace(/```/g, "").replace(/�/g, "").replace(/[^\x09\x0A\x0D\x20-\x7E\u0900-\u097F\u00A0-\u00FF\n]/g, " ").replace(/\s+/g, " ").trim();
}

export async function generateAdvisory(bundle: SourceBundle, controls: TransformControls): Promise<Artefact> {
  let data = advisoryFallback(bundle, controls);
  const warnings: string[] = [];
  let geminiUsed = false;

  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
      const resp = await client.models.generateContent({
        model,
        contents: `Source:\n${bundle.text.slice(0, 7000)}\n\nAudience: ${controls.audience}\nTone: ${controls.tone}\nLanguage: ${controls.language}\nDetail: ${controls.detail}\nObjective: ${controls.objective}\nStyle: ${controls.style}\n\nGenerate advisory JSON. Title digestible. Summary 80-120 words if Brief else 180-300. Assessment must reflect tone/style. Recommendations 3-5, actionable for audience. Language=${controls.language}. Plain text only, no markdown symbols like **, ##, \`\`\`. No weird symbols.`,
        config: {
          systemInstruction: `You are Content Forge advisory author for NTRO. Follow tone/language/detail/objective/style/audience. Write in ${controls.language}. Plain text only — never use markdown symbols like #, **, \`\`\`, ►, or replacement characters �. Return JSON only.`,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
        },
      });
      const parsed = JSON.parse(resp.text ?? "{}") as typeof data;
      if (parsed.title && parsed.summary) {
        data = {
          title: clean(parsed.title).slice(0, 90),
          summary: clean(parsed.summary).slice(0, 2000),
          background: clean(parsed.background || data.background).slice(0, 3000),
          assessment: clean(parsed.assessment || data.assessment).slice(0, 2000),
          recommendations: (parsed.recommendations || data.recommendations).map((r) => clean(r).slice(0, 280)).slice(0, 5),
        };
        geminiUsed = true;
      }
    } catch {
      warnings.push("Gemini Advisory failed — using fallback");
    }
  } else {
    warnings.push("GEMINI_API_KEY not set — Advisory uses deterministic template");
  }
  // final sanitize fallback too
  data = { title: clean(data.title), summary: clean(data.summary), background: clean(data.background), assessment: clean(data.assessment), recommendations: data.recommendations.map((r) => clean(r)) };

  const body = `${data.title}
Classification: For official use | Audience: ${controls.audience} | Tone: ${controls.tone} | Language: ${controls.language}

SUMMARY
${data.summary}

BACKGROUND
${data.background}

ASSESSMENT
${data.assessment}

RECOMMENDATIONS
${data.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}

DISTRIBUTION
${controls.audience}
`;
  return { type: "Advisory", title: data.title, body, metadata: { classification: "FOUO", tone: controls.tone, style: controls.style, summary: data.summary, background: data.background, assessment: data.assessment, recommendations: data.recommendations }, warnings, confidence: geminiUsed ? 85 : 68 };
}
