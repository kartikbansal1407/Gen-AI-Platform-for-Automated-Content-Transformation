import type { Artefact, SourceBundle, TransformControls, TransformResult } from "../types";
import { generateAdvisory } from "../outputs/advisory";
import { generateInfographic } from "../outputs/infographic";
import { generateLinkedIn } from "../outputs/linkedin";
import { generatePresentation } from "../outputs/presentation";
import { generateSummary } from "../outputs/summary";
import { generateTwitter } from "../outputs/twitter";
import { generateVideo } from "../outputs/video";

const generators: Record<string, (b: SourceBundle, c: TransformControls) => Promise<Artefact>> = {
  Video: generateVideo,
  LinkedIn: generateLinkedIn,
  Twitter: generateTwitter,
  Advisory: generateAdvisory,
  Infographic: generateInfographic,
  ExecutiveSummary: generateSummary,
  Presentation: generatePresentation,
};

export async function transformSource(bundle: SourceBundle, controls: TransformControls): Promise<TransformResult> {
  const sourceSummary = bundle.text.slice(0, 600);
  const outputs = controls.outputs;
  const results = await Promise.allSettled(outputs.map((o) => generators[o]?.(bundle, controls) ?? Promise.reject(new Error(`Unknown output ${o}`))));
  const artefacts: Artefact[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const type = outputs[i];
    if (r.status === "fulfilled") artefacts.push(r.value);
    else artefacts.push({ type, title: `${type} — failed`, body: `Generation failed: ${(r.reason as Error)?.message ?? "unknown"}`, metadata: {}, warnings: ["Generation failed"], confidence: 0 });
  }
  return { sourceSummary, artefacts };
}
