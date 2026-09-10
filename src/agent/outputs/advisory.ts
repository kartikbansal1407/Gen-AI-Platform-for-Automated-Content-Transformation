/**
 * Output: advisory.ts — Structured advisory document
 * PDF §5.4 — Title, Classification, Summary, Background, Assessment, Recommendations, Distribution
 * Template per style/tone, gov context
 */

import { transformContent } from "../ai";
import type { OperatorControls, SourceContent } from "../transform-types";
import { advisoryOutputSchema } from "../transform-types";

export async function generateAdvisory(
  source: SourceContent,
  controls: OperatorControls,
) {
  const {
    result,
    mode,
    enrichedSource,
    visionDescriptions,
    videoTranscript,
    keyframeDescriptions,
    ...artifacts
  } = await transformContent({ source, controls, outputType: "advisory" });
  const data = advisoryOutputSchema.parse(result);
  return {
    mode,
    result: data,
    enrichedSource,
    visionDescriptions,
    videoTranscript,
    keyframeDescriptions,
    ...artifacts,
  };
}

// Helper for rendering markdown
export function advisoryToMarkdown(advisory: {
  title: string;
  classification: string;
  summary: string;
  keyPoints: string[];
  recommendations: string[];
}): string {
  return `# ${advisory.title} — ${advisory.classification}\n\n## Summary\n${advisory.summary}\n\n## Key Points\n${advisory.keyPoints.map((k) => `- ${k}`).join("\n")}\n\n## Recommendations\n${advisory.recommendations.map((r) => `- ${r}`).join("\n")}`;
}

export { advisoryOutputSchema } from "../transform-types";
