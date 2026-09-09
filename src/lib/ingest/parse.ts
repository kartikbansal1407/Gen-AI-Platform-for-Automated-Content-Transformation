import { z } from "zod";

const allowedMimes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/markdown"] as const;
export const parsedDocSchema = z.object({
  filename: z.string().min(1).max(255),
  mime: z.enum(allowedMimes).or(z.string()),
  size: z.number().min(0).max(10 * 1024 * 1024),
  text: z.string(),
});

export type ParsedDoc = z.infer<typeof parsedDocSchema>;

export function validateFileMeta(filename: string, mime: string, size: number): string | null {
  if (size > 10 * 1024 * 1024) return "File too large (max 10 MB)";
  if (!filename || filename.length > 255) return "Invalid filename";
  return null;
}

export async function parseTextBuffer(buffer: Buffer, mime: string, filename: string): Promise<ParsedDoc> {
  const size = buffer.length;
  const err = validateFileMeta(filename, mime, size);
  if (err) throw new Error(err);
  let text = "";
  if (mime.includes("text") || mime.includes("markdown") || filename.endsWith(".txt") || filename.endsWith(".md")) {
    text = buffer.toString("utf-8");
  } else if (mime === "application/pdf" || filename.endsWith(".pdf")) {
    text = buffer.toString("utf-8").slice(0, 50000);
    if (!text.trim()) text = `[PDF ${filename} — binary content, please paste text manually if extraction failed]`;
  } else if (mime.includes("wordprocessingml") || filename.endsWith(".docx")) {
    text = buffer.toString("utf-8").slice(0, 50000);
    if (!text.trim()) text = `[DOCX ${filename} — binary content]`;
  } else {
    text = buffer.toString("utf-8").slice(0, 50000);
  }
  return { filename, mime, size, text: text.trim().slice(0, 80000) };
}
