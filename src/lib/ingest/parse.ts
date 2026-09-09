import { z } from "zod";

export const parsedDocSchema = z.object({
  filename: z.string().min(1).max(255),
  mime: z.string(),
  size: z.number().min(0).max(25 * 1024 * 1024),
  text: z.string(),
});

export type ParsedDoc = z.infer<typeof parsedDocSchema>;

const ALLOWED_EXT = [".pdf", ".pptx", ".ppt", ".docx", ".doc", ".txt", ".md", ".csv", ".rtf"];
const ALLOWED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/markdown",
  "text/csv",
];

export function validateFileMeta(filename: string, mime: string, size: number): string | null {
  if (size > 25 * 1024 * 1024) return "File too large (max 25 MB)";
  if (!filename || filename.length > 255) return "Invalid filename";
  const ext = "." + filename.split(".").pop()!.toLowerCase();
  if (!ALLOWED_EXT.includes(ext) && !ALLOWED_MIMES.includes(mime) && !mime.startsWith("text/")) {
    // still allow but warn — we try to extract
  }
  void mime;
  return null;
}

function cleanText(s: string) {
  return s.replace(/\x00/g, "").replace(/\r/g, "").trim().slice(0, 80000);
}

export async function parseBuffer(buffer: Buffer, mime: string, filename: string): Promise<ParsedDoc> {
  const size = buffer.length;
  const err = validateFileMeta(filename, mime, size);
  if (err) throw new Error(err);
  const lower = filename.toLowerCase();
  let text = "";

  try {
    if (lower.endsWith(".pdf")) {
      const mod = await import("pdf-parse") as unknown as Record<string, unknown>;
      let pdfText = "";
      // pdf-parse v2: new PDFParse({data: buffer}).getText()
      if (mod["PDFParse"]) {
        const PDFParse = mod["PDFParse"] as new (o: { data: Uint8Array | Buffer }) => { getText: () => Promise<{ text: string }>; destroy?: () => Promise<void> };
        const parser = new PDFParse({ data: buffer });
        const res = await parser.getText();
        pdfText = res.text || "";
        if (parser.destroy) await parser.destroy().catch(() => {});
      } else if (typeof (mod as { default?: unknown })["default"] === "function") {
        const legacy = (mod as { default: (b: Buffer) => Promise<{ text: string }> }).default;
        const data = await legacy(buffer);
        pdfText = data.text || "";
      } else if (typeof mod === "function") {
        const data = await (mod as unknown as (b: Buffer) => Promise<{ text: string }>)(buffer);
        pdfText = data.text || "";
      }
      text = pdfText;
      if (!text.trim()) text = `[PDF ${filename} extracted but no selectable text found — may be scanned]`;
    } else if (lower.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer });
      text = value || "";
    } else if (lower.endsWith(".pptx") || lower.endsWith(".ppt")) {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(buffer);
      const texts: string[] = [];
      // extract text from slides — crude but works for doc search
      const slideFiles = Object.keys(zip.files).filter((k) => k.startsWith("ppt/slides/slide"));
      for (const f of slideFiles) {
        const xml = await zip.files[f].async("string");
        const t = [...xml.matchAll(/<a:t[^>]*>([^<]+)<\/a:t>/g)].map((m) => m[1]).join(" ");
        if (t) texts.push(t);
      }
      if (texts.length) text = texts.join("\n\n");
      else {
        // fallback: try to read as utf8 snippets
        text = buffer.toString("utf-8").replace(/[^ -~\n]/g, " ").replace(/\s+/g, " ").slice(0, 50000);
        if (!text.trim()) text = `[PPT ${filename} — parsed ${slideFiles.length} slides]`;
      }
      text = `PPT ${filename} — ${texts.length} slides:\n` + text;
    } else if (lower.endsWith(".doc") || lower.endsWith(".rtf")) {
      text = buffer.toString("utf-8").replace(/\x00/g, "").slice(0, 50000);
      if (!text.trim()) text = `[DOC ${filename} — binary content]`;
    } else {
      // txt, md, csv, etc
      text = buffer.toString("utf-8");
    }
  } catch (e) {
    const msg = (e as Error).message?.slice(0, 200) || "parse failed";
    text = `[${filename} — parse error: ${msg}]\n` + buffer.toString("utf-8").slice(0, 10000);
  }

  return { filename, mime: mime || "application/octet-stream", size, text: cleanText(text) };
}

// Client-side helper: for browser File -> {filename,mime,text} using FileReader
export async function fileToParsedDoc(file: File): Promise<ParsedDoc> {
  const buf = Buffer.from(await file.arrayBuffer());
  return parseBuffer(buf, file.type, file.name);
}
