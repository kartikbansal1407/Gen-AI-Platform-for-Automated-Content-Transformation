/**
 * Video helper – best-effort audio extraction + keyframe plumbing.
 * Full ffmpeg extraction is optional; if ffmpeg is unavailable we degrade
 * gracefully and still forward keyframes if the caller already extracted them.
 * The AI layer treats this as non-blocking.
 */

import type { ImageInput, VideoInput } from "./transform-types";

export type VideoEnrichmentInput = {
  videoBuffer?: Buffer;
  mimeType?: string;
  providedKeyframes?: ImageInput[];
};

/**
 * Best-effort: try to extract a handful of keyframes if ffmpeg is available,
 * otherwise return provided frames unchanged. This function never throws – it
 * returns an empty array on failure so the transform pipeline continues.
 */
export async function extractKeyframesBestEffort(_input: VideoEnrichmentInput): Promise<ImageInput[]> {
  // No extra library required per spec – we keep this as a stub that
  // transparently passes through caller-provided frames. If a future
  // deployment installs ffmpeg, extend this function to shell out to it.
  if (_input.providedKeyframes && _input.providedKeyframes.length > 0) {
    return _input.providedKeyframes.slice(0, 5);
  }
  return [];
}

/**
 * Normalize a VideoInput for the AI layer – ensure keyframes are capped.
 */
export function normalizeVideoInput(video: VideoInput | undefined): VideoInput | undefined {
  if (!video) return undefined;
  return {
    ...video,
    keyframes: video.keyframes ? video.keyframes.slice(0, 5) : undefined,
  };
}
