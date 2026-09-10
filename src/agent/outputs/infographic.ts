/**
 * Infographic output helper – extracts the image-generation step.
 * Delegates to ai.ts generateInfographicImage (provider-abstraction).
 */

export type InfographicPlan = {
  title: string;
  headline: string;
  keyStats: Array<{ label: string; value: string; sourceSpan: string }>;
  sections: Array<{ heading: string; bullets: string[] }>;
  imagePrompt: string;
  palette: string;
};

export type InfographicResult = InfographicPlan & {
  image?: {
    imageBase64?: string;
    imageUrl?: string;
    prompt: string;
    mode: string;
  };
};

export { infographicOutputSchema } from "../transform-types";
export async function generateInfographic(
  source: import("../transform-types").SourceContent,
  controls: import("../transform-types").OperatorControls,
) {
  const { transformContent } = await import("../ai");
  return transformContent({ source, controls, outputType: "infographic" });
}
