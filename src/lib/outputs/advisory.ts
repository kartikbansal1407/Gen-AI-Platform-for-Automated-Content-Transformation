import type { Artefact, SourceBundle, TransformControls } from "../types";

export async function generateAdvisory(bundle: SourceBundle, controls: TransformControls): Promise<Artefact> {
  const src = bundle.text.slice(0, 3000);
  const body = `# Advisory — ${controls.audience}\n\n**Classification:** For official use\n\n## Summary\n${src.slice(0, 500)}\n\n## Background\n${src.slice(500, 1100)}\n\n## Assessment\n- Tone: ${controls.tone}, Style: ${controls.style}, Detail: ${controls.detail}\n- Objective: ${controls.objective}\n\n## Recommendations\n1. Disseminate to relevant stakeholders.\n2. Monitor for follow-up indicators.\n\n## Distribution\n${controls.audience}\n`;
  return { type: "Advisory", title: "Advisory Document", body, metadata: { classification: "FOUO" }, warnings: [], confidence: 68 };
}
