/**
 * Output: linkedin.ts — LinkedIn Post generator
 * PDF §5.4 D. — Professional post 280–600 words, hook, body, CTA, hashtags
 * Wraps ai.ts transformContent for outputType linkedin_post
 */

import { transformContent } from "../ai";
import type { OperatorControls, SourceContent } from "../transform-types";
import { linkedinPostOutputSchema } from "../transform-types";

export type LinkedInArtefact = {
  title: string;
  body: string;
  hashtags: string[];
  audience: string;
  objective: string;
  voiceMatch: number;
  confidence: number;
  recommendation: string;
  warnings: string[];
  sourceAttribution: string;
};

export async function generateLinkedInPost(
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
  } = await transformContent({ source, controls, outputType: "linkedin_post" });
  const data = linkedinPostOutputSchema.parse(result);
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

export { linkedinPostOutputSchema } from "../transform-types";
