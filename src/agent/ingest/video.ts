import { z } from "zod";
import { videoInputSchema, type VideoInput } from "../transform-types";
import { validateMedia } from "@/lib/ingest-request";
export const videoUploadSchema = videoInputSchema.safeExtend({
  filename: z.string().min(1).max(255),
  size: z.number().int().positive().max(10485760),
});
export type ValidatedVideo = VideoInput & {
  filename: string;
  size: number;
  warnings: string[];
};
export function validateVideo(input: unknown): {
  valid: ValidatedVideo | null;
  warnings: string[];
} {
  try {
    const parsed = videoUploadSchema.parse(input);
    if (parsed.base64) {
      const bytes = Buffer.from(parsed.base64, "base64");
      if (bytes.length !== parsed.size) throw new Error();
      validateMedia(bytes, parsed.mimeType ?? "");
    }
    return { valid: { ...parsed, warnings: [] }, warnings: [] };
  } catch {
    return {
      valid: null,
      warnings: ["Invalid video: provide MP4/WEBM of at most 10 MB."],
    };
  }
}
