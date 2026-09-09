import type { SourceBundle, TransformControls } from "../types";

export function buildSystemInstruction(controls: TransformControls, outputType: string): string {
  return `You are Content Forge, a Gen-AI transformation engine for NTRO (SIH PS 26154).
Output type: ${outputType}
Audience: ${controls.audience}
Tone: ${controls.tone}
Language: ${controls.language}
Detail: ${controls.detail}
Objective: ${controls.objective}
Style: ${controls.style}
Rules: Stay factual, avoid generic AI clichés, no spam/fake engagement. Return JSON only per schema. Language must be ${controls.language}.`;
}

export function buildUserPrompt(bundle: SourceBundle): string {
  return `Source content:\n${bundle.text.slice(0, 30000)}\n\nGenerate the requested artefact.`;
}
