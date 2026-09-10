/**
 * Video package output – mirrors src/outputs/video.py in the Python spec.
 * Assembles video packages and calls ElevenLabs for narration audio.
 * Follows same provider-abstraction fallback pattern as ai.ts.
 */

export type VideoNarrationResult = {
  mode: "elevenlabs" | "demo";
  audioBase64?: string; // base64 mp3
  audioUrl?: string;
  voiceId: string;
  characters: number;
  warnings: string[];
};

const ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

function getElevenLabsKey(): string | null {
  return process.env.ELEVENLABS_API_KEY ?? null;
}

function getElevenLabsVoice(): string {
  return process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM"; // Rachel – default
}

function getElevenLabsModel(): string {
  return process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2";
}

export async function synthesizeNarration(
  narrationText: string,
  opts?: { voiceId?: string },
): Promise<VideoNarrationResult> {
  const apiKey = getElevenLabsKey();
  const voiceId = opts?.voiceId ?? getElevenLabsVoice();
  const warnings: string[] = [];

  if (!apiKey) {
    return {
      mode: "demo",
      voiceId,
      characters: narrationText.length,
      warnings: [
        "ELEVENLABS_API_KEY not set – demo mode, no audio synthesized. Add key for live TTS.",
      ],
    };
  }

  if (!narrationText?.trim()) {
    return {
      mode: "demo",
      voiceId,
      characters: 0,
      warnings: ["Empty narrationText – no audio generated."],
    };
  }

  // ElevenLabs limit ~5000 chars per request; truncate best-effort
  const truncated = narrationText.slice(0, 4500);
  if (narrationText.length > 4500)
    warnings.push(
      "NarrationText truncated to 4500 chars for ElevenLabs limit.",
    );

  try {
    const response = await fetch(
      `${ELEVENLABS_TTS_URL}/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        signal: AbortSignal.timeout(60000),
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: truncated,
          model_id: getElevenLabsModel(),
          voice_settings: { stability: 0.5, similarity_boost: 0.7 },
        }),
      },
    );

    if (!response.ok) {
      return {
        mode: "demo",
        voiceId,
        characters: truncated.length,
        warnings: [
          `ElevenLabs request failed (${response.status}): narration text remains available.`,
        ],
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      mode: "elevenlabs",
      audioBase64: buffer.toString("base64"),
      voiceId,
      characters: truncated.length,
      warnings,
    };
  } catch {
    return {
      mode: "demo",
      voiceId,
      characters: truncated.length,
      warnings: [`ElevenLabs exception: narration text remains available.`],
    };
  }
}

export type VideoPackageAssembly = {
  title: string;
  script: string;
  narrationText: string;
  scenes: Array<{
    title: string;
    description: string;
    durationSeconds: number;
    visualPrompt?: string;
  }>;
  warnings: string[];
};

export async function assembleVideoPackage(
  parsed: VideoPackageAssembly,
): Promise<VideoPackageAssembly & { narration: VideoNarrationResult }> {
  const narration = await synthesizeNarration(parsed.narrationText);
  return { ...parsed, narration };
}

export { videoPackageOutputSchema } from "../transform-types";
export async function generateVideo(
  source: import("../transform-types").SourceContent,
  controls: import("../transform-types").OperatorControls,
) {
  const { transformContent } = await import("../ai");
  return transformContent({ source, controls, outputType: "video_package" });
}
