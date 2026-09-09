export type ImageMeta = { filename: string; mime: string; caption?: string };
export const allowedImageMimes = ["image/png", "image/jpeg", "image/webp"] as const;

export function validateImage(mime: string, size: number): string | null {
  if (size > 10 * 1024 * 1024) return "Image too large (max 10 MB)";
  if (!allowedImageMimes.includes(mime as (typeof allowedImageMimes)[number]) && !mime.startsWith("image/")) return "Unsupported image type";
  return null;
}
