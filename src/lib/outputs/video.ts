import type { Artefact, SourceBundle, TransformControls } from "../types";

export async function generateVideo(bundle: SourceBundle, controls: TransformControls): Promise<Artefact> {
  const src = bundle.text.slice(0, 2000);
  const script = `VO: ${src.slice(0, 300)} [Tone: ${controls.tone}]`;
  const storyboard = [
    { scene: 1, visual: "Opening title — Content Forge", duration: "5s", transition: "fade" },
    { scene: 2, visual: "Context montage", duration: "10s", transition: "cut" },
    { scene: 3, visual: "Key finding overlay", duration: "8s", transition: "wipe" },
    { scene: 4, visual: "Closing CTA for " + controls.audience, duration: "7s", transition: "fade" },
  ];
  const srt = `1\n00:00:00,000 --> 00:00:05,000\n${src.slice(0, 80)}\n`;
  const warnings: string[] = [];
  let audioUrl: string | undefined;
  if (!process.env.ELEVENLABS_API_KEY) warnings.push("Audio requires ELEVENLABS_API_KEY — script/storyboard/SRT provided without mp3");
  else audioUrl = "https://api.elevenlabs.io/v1/text-to-speech/pending";
  return {
    type: "Video",
    title: "Video Package",
    body: `## Script\n${script}\n\n## Storyboard\n${JSON.stringify(storyboard, null, 2)}\n\n## Subtitles (SRT)\n\`\`\`srt\n${srt}\n\`\`\``,
    metadata: { script, storyboard, srt, audioUrl, visualRecs: ["stock B-roll: policy briefing", "overlay: data chart"] },
    warnings,
    confidence: 60,
  };
}
