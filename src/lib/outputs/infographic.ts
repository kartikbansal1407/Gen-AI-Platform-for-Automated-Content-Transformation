import type { Artefact, SourceBundle, TransformControls } from "../types";
export async function generateInfographic(bundle: SourceBundle, controls: TransformControls): Promise<Artefact> {
  const src = bundle.text.slice(0, 1500);
  const body = `# Infographic Brief — ${controls.style}\n\n**Headline:** ${src.slice(0, 80)}\n\n**Data Points (5-7):**\n- ${src.slice(0, 120)}\n- Audience: ${controls.audience}\n- Tone: ${controls.tone}\n- Language: ${controls.language}\n- Objective: ${controls.objective}\n\n**Visual hierarchy:** Hero stat → 3-column facts → timeline → CTA\n**Icons:** shield, chart, globe\n**Color cues:** teal #0d5e5e / slate / amber accent\n**CTA:** Learn more — follow-up briefing\n`;
  return { type: "Infographic", title: "Infographic — Content + Layout", body, metadata: { sections: 4 }, warnings: [], confidence: 65 };
}
