import type { Artefact, SourceBundle, TransformControls } from "../types";
import { GoogleGenAI } from "@google/genai";

type InfographicData = {
  headline: string;
  subhead: string;
  points: { label: string; value: string; note: string }[];
  palette: string[];
  imagePrompt: string;
};

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "subhead", "points", "imagePrompt"],
  properties: {
    headline: { type: "string" },
    subhead: { type: "string" },
    points: {
      type: "array", minItems: 5, maxItems: 7,
      items: { type: "object", additionalProperties: false, required: ["label", "value", "note"], properties: { label: { type: "string" }, value: { type: "string" }, note: { type: "string" } } }
    },
    imagePrompt: { type: "string" },
  }
};

function paletteFor(controls: TransformControls): string[] {
  const byTone: Record<string, string[]> = {
    Analytical: ["#0F1B2A", "#14B8A6", "#38BDF8", "#7DD3FC", "#F1F5F9"],
    Formal: ["#0B1628", "#C9A86A", "#8CA0BE", "#E2EAF5", "#F8FAFC"],
    Persuasive: ["#1A1242", "#7C3AED", "#A78BFA", "#F59E0B", "#FEF3C7"],
    Advisory: ["#28130A", "#F59E0B", "#FBBF24", "#FDBA74", "#FFF7ED"],
    Playful: ["#0F1B2A", "#FB7185", "#34D399", "#60A5FA", "#FEF3F2"],
    Conversational: ["#0F2A2E", "#14B8A6", "#2DD4BF", "#5EEAD4", "#ECFEFF"],
  };
  return byTone[controls.tone] || byTone.Analytical;
}

function fallbackData(bundle: SourceBundle, controls: TransformControls): InfographicData {
  const src = bundle.text.slice(0, 900).replace(/\s+/g, " ").trim();
  const headline = src.slice(0, 64).split(".")[0] || "Content Forge Brief";
  return {
    headline,
    subhead: `For ${controls.audience} • ${controls.tone} • ${controls.language} • ${controls.style} — ${controls.objective}`,
    points: [
      { label: controls.style === "Technical" ? "Signal" : "Insight", value: src.slice(0, 52) || "Key point from source", note: controls.detail },
      { label: "Audience", value: controls.audience, note: controls.objective },
      { label: "Tone", value: controls.tone, note: controls.language },
      { label: "Style", value: controls.style, note: `Detail ${controls.detail}` },
      { label: "Action", value: controls.objective === "Alert" ? "Review within 24h" : "Follow-up briefing", note: "next steps" },
    ].slice(0, controls.detail === "Brief" ? 5 : 6),
    palette: paletteFor(controls),
    imagePrompt: `infographic hero for ${controls.audience}, ${controls.style}, tone ${controls.tone}`,
  };
}

function iconSvg(kind: string, color: string) {
  if (kind.toLowerCase().includes("insight") || kind.toLowerCase().includes("signal")) return `<circle cx="12" cy="12" r="8" fill="${color}" opacity="0.9"/><circle cx="12" cy="12" r="4" fill="white" opacity="0.95"/>`;
  if (kind.toLowerCase().includes("audience")) return `<path d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 18c0-2.2 2.7-4 6-4s6 1.8 6 4v1H6v-1Z" fill="${color}"/>`;
  if (kind.toLowerCase().includes("tone")) return `<path d="M8 14a4 4 0 0 1 8 0l-1 1a3 3 0 0 0-6 0l-1-1Z" fill="${color}"/><circle cx="12" cy="8" r="3" fill="${color}"/>`;
  return `<rect x="6" y="8" width="12" height="8" rx="2" fill="${color}"/><path d="M8 12h8M12 8v8" stroke="white" stroke-width="1.5" stroke-linecap="round"/>`;
}

function buildInfographicSvg(data: InfographicData): string {
  const colors = data.palette;
  const bg = colors[0];
  const accent = colors[1];
  const cardA = "#162A45";
  const cardB = "#1A345A";
  // subtle radial highlight
  const defs = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${accent}" stop-opacity="0.18"/><stop offset="100%" stop-color="${bg}" stop-opacity="0"/></linearGradient><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.25"/></filter></defs>`;
  const pointsSvg = data.points.map((p, i) => {
    const y = 150 + i * 76;
    const cardFill = i % 2 === 0 ? cardA : cardB;
    const accentColor = colors[2 + (i % 2)] || accent;
    return `
    <g filter="url(#shadow)">
      <rect x="32" y="${y}" width="736" height="64" rx="14" fill="${cardFill}" stroke="#1E3A5E" stroke-width="1"/>
      <rect x="32" y="${y}" width="736" height="64" rx="14" fill="url(#g)" opacity="0.5"/>
      <g transform="translate(44, ${y + 16})">
        <rect width="32" height="32" rx="8" fill="${accentColor}" opacity="0.18"/>
        <g transform="translate(4,4) scale(0.85)">${iconSvg(p.label, accentColor)}</g>
      </g>
      <text x="86" y="${y+28}" font-family="Inter, 'Segoe UI', sans-serif" font-size="12.5" font-weight="700" fill="#E6EEF9" letter-spacing="0.2">${escapeXml(p.label)}</text>
      <text x="86" y="${y+46}" font-family="Inter, 'Segoe UI', sans-serif" font-size="11" fill="#9AB0CC">${escapeXml(p.value.slice(0, 82))}</text>
      <text x="740" y="${y+32}" font-family="Inter, 'Segoe UI', sans-serif" font-size="10" font-weight="600" fill="${accent}" text-anchor="end" opacity="0.95">${escapeXml(p.note.slice(0, 22).toUpperCase())}</text>
    </g>`;
  }).join("");

  const h = 160 + data.points.length * 76 + 90;
  return `<svg width="800" height="${h}" viewBox="0 0 800 ${h}" xmlns="http://www.w3.org/2000/svg" role="img">
  ${defs}
  <rect width="800" height="${h}" rx="22" fill="${bg}"/>
  <rect x="0" y="0" width="800" height="6" rx="3" fill="${accent}"/>
  <rect x="32" y="18" width="120" height="22" rx="11" fill="white" opacity="0.07" stroke="white" stroke-opacity="0.08"/>
  <text x="92" y="33" font-family="Inter, sans-serif" font-size="10" font-weight="700" fill="${accent}" text-anchor="middle" letter-spacing="1.4">CONTENT FORGE</text>
  <text x="32" y="68" font-family="Inter, sans-serif" font-size="28" font-weight="800" fill="#FFFFFF" letter-spacing="-0.5">${escapeXml(data.headline.slice(0, 54))}</text>
  <text x="32" y="96" font-family="Inter, sans-serif" font-size="12" fill="#9AB0CC">${escapeXml(data.subhead.slice(0, 96))}</text>
  <line x1="32" y1="118" x2="768" y2="118" stroke="white" stroke-opacity="0.08" stroke-width="1"/>
  ${pointsSvg}
  <rect x="32" y="${h - 58}" width="736" height="48" rx="12" fill="${accent}"/>
  <text x="400" y="${h - 30}" font-family="Inter, sans-serif" font-size="13" font-weight="750" fill="${bg}" text-anchor="middle">Learn more — follow-up briefing</text>
  <text x="400" y="${h - 14}" font-family="Inter, sans-serif" font-size="9" fill="${bg}" opacity="0.72" text-anchor="middle">${escapeXml(data.imagePrompt.slice(0, 78))}</text>
</svg>`;
}

function escapeXml(s: string) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

function svgToDataUrl(svg: string) {
  const b64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}

export async function generateInfographic(bundle: SourceBundle, controls: TransformControls): Promise<Artefact> {
  const warnings: string[] = [];
  let data: InfographicData = fallbackData(bundle, controls);
  let geminiUsed = false;

  if (process.env.GEMINI_API_KEY) {
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
      const resp = await client.models.generateContent({
        model,
        contents: `Source:\n${bundle.text.slice(0, 6000)}\n\nAudience: ${controls.audience}\nTone: ${controls.tone}\nLanguage: ${controls.language}\nDetail: ${controls.detail}\nObjective: ${controls.objective}\nStyle: ${controls.style}\n\nGenerate infographic JSON: headline (short), subhead, 5-7 points {label,value,note}, imagePrompt. Language ${controls.language}.`,
        config: {
          systemInstruction: "You are Content Forge infographic designer. Return JSON only per schema.",
          responseMimeType: "application/json",
          responseJsonSchema: schema,
        }
      });
      const parsed = JSON.parse(resp.text ?? "{}") as InfographicData;
      if (parsed.headline && Array.isArray(parsed.points) && parsed.points.length >= 5) {
        data = { headline: parsed.headline.slice(0, 60), subhead: parsed.subhead?.slice(0, 100) || data.subhead, points: parsed.points.slice(0, 7), palette: data.palette, imagePrompt: parsed.imagePrompt?.slice(0, 120) || data.imagePrompt };
        geminiUsed = true;
      }
    } catch {
      warnings.push("Gemini infographic JSON failed — using fallback");
    }
  } else {
    warnings.push("GEMINI_API_KEY not set — infographic uses deterministic data (set key for AI headlines)");
  }

  const svg = buildInfographicSvg(data);
  const dataUrl = svgToDataUrl(svg);

  const body = `# Infographic — ${data.headline}\n\n**Subhead:** ${data.subhead}\n\n${data.points.map((p) => `- **${p.label}:** ${p.value} _(${p.note})_`).join("\n")}\n\n**Visual:** ${data.imagePrompt}\n\n![infographic](${dataUrl.slice(0, 60)}...) — download SVG/PNG below.`;

  return {
    type: "Infographic",
    title: `Infographic — ${data.headline.slice(0, 40)}`,
    body,
    metadata: { headline: data.headline, points: data.points, svg, imageDataUrl: dataUrl, imagePrompt: data.imagePrompt, provider: geminiUsed ? "gemini" : "fallback" },
    warnings,
    confidence: geminiUsed ? 78 : 65,
  };
}
