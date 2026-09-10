/**
 * Output: summary.ts — Executive Summary (concise briefing)
 * PDF §5.4 — TL;DR (2 lines), Context, Key Findings (3–5 bullets), Implications, Next Steps
 * Length tied to detailLevel: Brief 120w / Standard 300w / Detailed 600w
 */

import { transformContent } from "../ai";
import type { OperatorControls, SourceContent } from "../transform-types";
import { executiveSummaryOutputSchema } from "../transform-types";

export async function generateExecutiveSummary(
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
  } = await transformContent({
    source,
    controls,
    outputType: "executive_summary",
  });
  const data = executiveSummaryOutputSchema.parse(result);
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

export function detailToWordLimit(detailLevel: string): number {
  switch (detailLevel) {
    case "brief":
      return 120;
    case "detailed":
      return 600;
    default:
      return 300; // standard
  }
}

export { executiveSummaryOutputSchema } from "../transform-types";
