/**
 * Output: twitter.ts — Twitter/X Post (thread)
 * PDF §5.4 — 280-char tweet or 4–8 tweet thread, alt text for images
 */

import { transformContent } from "../ai";
import type { OperatorControls, SourceContent } from "../transform-types";
import { twitterPostOutputSchema } from "../transform-types";

export async function generateTwitterPost(
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
  } = await transformContent({ source, controls, outputType: "twitter_post" });
  const data = twitterPostOutputSchema.parse(result);
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

export { twitterPostOutputSchema } from "../transform-types";
