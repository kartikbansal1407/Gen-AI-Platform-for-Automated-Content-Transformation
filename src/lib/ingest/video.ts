export type VideoMeta = { filename: string; mime: string; size: number };
export const allowedVideoMimes = ["video/mp4", "video/webm"] as const;

export function validateVideo(mime: string, size: number): string | null {
  if (size > 50 * 1024 * 1024) return "Video too large (max 50 MB)";
  if (!allowedVideoMimes.includes(mime as (typeof allowedVideoMimes)[number]) && !mime.startsWith("video/")) return "Unsupported video type";
  return null;
}
