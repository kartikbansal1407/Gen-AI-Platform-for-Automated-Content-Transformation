import { GoogleGenAI } from "@google/genai";
import type { Artefact, SourceBundle, TransformControls } from "../types";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["tldr", "context", "findings", "implications", "nextSteps"],
  properties: {
    tldr: { type: "string" }, context: { type: "string" },
    findings: { type: "array", items: { type: "string" } },
    implications: { type: "string" }, nextSteps: { type: "array", items: { type: "string" } },
  },
};

function clean(s: string) {
  return s.replace(/\*\*/g, "").replace(/__+/g, "").replace(/^#+\s*/gm, "").replace(/```/g, "").replace(/�/g, "").replace(/[^\x09\x0A\x0D\x20-\x7E\u0900-\u097F\u00A0-\u00FF\n]/g, " ").replace(/\s+/g, " ").trim();
}

export async function generateSummary(bundle: SourceBundle, controls: TransformControls): Promise<Artefact> {
  const limit = controls.detail === "Brief" ? 120 : controls.detail === "Detailed" ? 600 : 300;
  const src = bundle.text;
  const warnings: string[] = [];
  let data: { tldr: string; context: string; findings: string[]; implications: string; nextSteps: string[] } = {
    tldr: clean(src.slice(0, 160)) || "Brief from source",
    context: clean(src.slice(160, 520)) || "Context from source",
    findings: [clean(src.slice(0, 110)) || "Finding 1", `Objective ${controls.objective} for ${controls.audience}`, `Tone ${controls.tone}, style ${controls.style}`].slice(0, controls.detail === "Brief" ? 2 : 5),
    implications: `Operational relevance for ${controls.audience} — ${controls.objective} in ${controls.language}.`,
    nextSteps: controls.objective === "Alert" ? ["Alert stakeholders", "Review controls"] : ["Brief stakeholders", "Track indicators"],
  };
  let geminiUsed = false;

  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
      const resp = await client.models.generateContent({
        model,
        contents: `Source:\n${src.slice(0, 7000)}\n\nAudience: ${controls.audience}\nTone: ${controls.tone}\nLanguage: ${controls.language}\nDetail: ${controls.detail} (target ${limit} words)\nObjective: ${controls.objective}\nStyle: ${controls.style}\n\nGenerate summary JSON: tldr 2 lines, context 1 para, findings 3-5 bullets, implications 1 para, nextSteps 2-3 bullets. Language=${controls.language}, tone=${controls.tone}. Plain text only, no markdown symbols like **, ##, \`\`\` and no weird symbols like �.`,
        config: {
          systemInstruction: `You are Content Forge executive summary writer. Follow tone/language/detail/objective/style/audience. Length target ${limit} words. Write in ${controls.language}. Plain text only — never use markdown symbols like #, **, \`\`\` or replacement characters �. Return JSON only.`,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
        },
      });
      const parsed = JSON.parse(resp.text ?? "{}") as typeof data;
      if (parsed.tldr && Array.isArray(parsed.findings)) {
        data = {
          tldr: clean(parsed.tldr).slice(0, 400),
          context: clean(parsed.context || data.context).slice(0, 1200),
          findings: parsed.findings.map((f) => clean(f)).slice(0, 5),
          implications: clean(parsed.implications || data.implications).slice(0, 800),
          nextSteps: (parsed.nextSteps || data.nextSteps).map((s) => clean(s)).slice(0, 4),
        };
        geminiUsed = true;
      }
    } catch {
      warnings.push("Gemini Summary failed — using fallback");
    }
  } else {
    warnings.push("GEMINI_API_KEY not set — Summary uses deterministic template");
  }
  data = { tldr: clean(data.tldr), context: clean(data.context), findings: data.findings.map((f) => clean(f)), implications: clean(data.implications), nextSteps: data.nextSteps.map((s) => clean(s)) };

  const body = `EXECUTIVE SUMMARY — for ${controls.audience}

TL;DR
${data.tldr}

CONTEXT
${data.context}

KEY FINDINGS
${data.findings.map((f) => `• ${f}`).join("\n")}

IMPLICATIONS
${data.implications}

NEXT STEPS
${data.nextSteps.map((s) => `• ${s}`).join("\n")}

Audience: ${controls.audience} | Tone: ${controls.tone} | Language: ${controls.language} | Style: ${controls.style} | Target ~${limit} words`;
  return { type: "ExecutiveSummary", title: `Executive Summary — for ${controls.audience}`, body, metadata: { tldr: data.tldr, context: data.context, findings: data.findings, implications: data.implications, nextSteps: data.nextSteps, wordTarget: limit, detail: controls.detail, language: controls.language }, warnings, confidence: geminiUsed ? 86 : 75 };
}
