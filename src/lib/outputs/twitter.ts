import type { Artefact, SourceBundle, TransformControls } from "../types";

export async function generateTwitter(bundle: SourceBundle, controls: TransformControls): Promise<Artefact> {
  const src = bundle.text.slice(0, 600).replace(/\s+/g, " ").trim();
  const tweets = [
    `1/4 ${src.slice(0, 220)}`,
    `2/4 Context for ${controls.audience} — tone: ${controls.tone}, objective: ${controls.objective}.`,
    `3/4 Key point: ${src.slice(220, 380) || "Operational implications matter more than headlines."}`,
    `4/4 ${controls.style} briefing via Content Forge. #SIH`,
  ];
  return {
    type: "Twitter",
    title: `X Thread — ${src.slice(0, 30)}`,
    body: tweets.join("\n\n"),
    metadata: { tweets, count: tweets.length },
    warnings: [],
    confidence: 70,
  };
}
