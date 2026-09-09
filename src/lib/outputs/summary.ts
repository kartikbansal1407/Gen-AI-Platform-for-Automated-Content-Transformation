import type { Artefact, SourceBundle, TransformControls } from "../types";
export async function generateSummary(bundle: SourceBundle, controls: TransformControls): Promise<Artefact> {
  const src = bundle.text;
  const limit = controls.detail === "Brief" ? 120 : controls.detail === "Detailed" ? 600 : 300;
  const body = `**TL;DR:** ${src.slice(0, 160)}\n\n**Context:** ${src.slice(160, 500)}\n\n**Key Findings:**\n- ${src.slice(0, 120)}\n- Objective ${controls.objective} for ${controls.audience}\n- Style: ${controls.style}\n\n**Implications:** Operational relevance for policy planning.\n\n**Next Steps:** Brief stakeholders, track indicators. (Target ~${limit} words, detail=${controls.detail})`;
  return { type: "ExecutiveSummary", title: "Executive Summary", body, metadata: { wordTarget: limit }, warnings: [], confidence: 75 };
}
