import type { Artefact, SourceBundle, TransformControls } from "../types";

export async function generateLinkedIn(bundle: SourceBundle, controls: TransformControls): Promise<Artefact> {
  const src = bundle.text.slice(0, 2000).replace(/\s+/g, " ").trim();
  const body = `**Hook:** What ${src.slice(0, 80)} means for ${controls.audience}.\n\n${src.slice(0, 400)}\n\n**Takeaway:** An ${controls.tone.toLowerCase()} briefing for ${controls.audience} — objective: ${controls.objective}. Language: ${controls.language}. Detail: ${controls.detail}.\n\n#ContentForge #SIH2025`;
  return {
    type: "LinkedIn",
    title: `LinkedIn Post — ${src.slice(0, 40) || "Source briefing"}`,
    body,
    metadata: { platform: "LinkedIn" },
    warnings: [],
    confidence: 72,
  };
}
