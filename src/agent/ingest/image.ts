import { z } from "zod";
import { imageInputSchema, type ImageInput } from "../transform-types";
import { validateMedia } from "@/lib/ingest-request";
export const imageUploadSchema = imageInputSchema.safeExtend({
  filename: z.string().min(1).max(255),
  size: z.number().int().positive().max(10485760),
});
export type ValidatedImage = ImageInput & { filename: string; size: number };
export function validateImages(inputs: unknown[]): {
  valid: ValidatedImage[];
  warnings: string[];
} {
  const valid: ValidatedImage[] = [];
  const warnings: string[] = [];
  if (inputs.length > 5)
    return { valid, warnings: ["Maximum five images per job."] };
  for (const input of inputs) {
    try {
      const parsed = imageUploadSchema.parse(input);
      if (parsed.base64) {
        const bytes = Buffer.from(parsed.base64, "base64");
        if (bytes.length !== parsed.size) throw new Error();
        validateMedia(bytes, parsed.mimeType ?? "");
      }
      valid.push(parsed);
    } catch {
      warnings.push("Invalid image: verify PNG/JPEG/WEBP contents and size.");
    }
  }
  return { valid, warnings };
}
