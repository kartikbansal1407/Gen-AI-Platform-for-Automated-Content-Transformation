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
      let pdfText = "";
      try {
        const mod = await import("pdf-parse") as unknown as Record<string, unknown>;
        // pdf-parse v2: new PDFParse({data: buffer, disableWorker: true}).getText() — disableWorker avoids G:\Projects\SIH 26 path with space
        if (mod["PDFParse"]) {
          const PDFParse = mod["PDFParse"] as new (o: Record<string, unknown>) => { getText: () => Promise<{ text: string }>; destroy?: () => Promise<void> };
          // try with disableWorker first
          let parser: { getText: () => Promise<{ text: string }>; destroy?: () => Promise<void> } | null = null;
          try {
            parser = new PDFParse({ data: buffer, disableWorker: true, verbosity: 0 } as unknown as Record<string, unknown>);
          } catch {
            parser = new PDFParse({ data: buffer } as unknown as Record<string, unknown>);
          }
          try {
            const res = await parser.getText();
            pdfText = res.text || "";
          } catch (inner) {
            // fallback: try without disableWorker but with worker disabled via global
            const msg = (inner as Error).message || "";
            if (msg.includes("fake worker") || msg.includes("worker")) {
              // try disabling via setWorker
              const setter = (PDFParse as unknown as { setWorker?: (s: string) => void }).setWorker;
              if (setter) try { setter(""); } catch {}
              const retry = new PDFParse({ data: buffer, disableWorker: true } as unknown as Record<string, unknown>);
              const res2 = await retry.getText();
              pdfText = res2.text || "";
              if (retry.destroy) await retry.destroy().catch(() => {});
            } else throw inner;
          }
          if (parser?.destroy) await parser.destroy().catch(() => {});
          // if still empty, fallback to regex extraction
          if (!pdfText.trim()) {
            const raw = buffer.toString("utf-8");
            const matches = [...raw.matchAll(/\(([^\)]{4,200})\)/g)].map((m) => m[1]).filter((t) => /[a-zA-Z]{3,}/.test(t));
            if (matches.length) pdfText = matches.join(" ").slice(0, 80000);
          }
        } else if (typeof (mod as { default?: unknown })["default"] === "function") {
          const legacy = (mod as { default: (b: Buffer) => Promise<{ text: string }> }).default;
          const data = await legacy(buffer);
          pdfText = data.text || "";
        } else if (typeof mod === "function") {
          const data = await (mod as unknown as (b: Buffer) => Promise<{ text: string }>)(buffer);
          pdfText = data.text || "";
        }
      } catch (pdfErr) {
        const raw = buffer.toString("utf-8");
        const matches = [...raw.matchAll(/\(([^\)]{4,200})\)/g)].map((m) => m[1]).filter((t) => /[a-zA-Z]{3,}/.test(t));
        if (matches.length) pdfText = matches.join(" ").slice(0, 80000);
        if (!pdfText.trim()) pdfText = `[PDF ${filename} — text extraction failed, try a text-based PDF]`;
        // don't leak full path like G:\Projects\SIH 26
        void pdfErr;
      }
      text = pdfText;
      if (!text.trim()) text = `[PDF ${filename} — no extractable text, may be scanned image PDF]`;
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
    const rawMsg = (e as Error).message || "parse failed";
    // strip absolute paths like G:\Projects\SIH 26\... to avoid leaking and garbling
    const msg = rawMsg.replace(/G:[^\s]*Projects[^\s]*/g, "[path]").replace(/\s+/g, " ").slice(0, 180);
    text = `[${filename} — parse error: ${msg}]`;
  }

  return { filename, mime: mime || "application/octet-stream", size, text: cleanText(text) };
}

// Client-side helper: for browser File -> {filename,mime,text} using FileReader
export async function fileToParsedDoc(file: File): Promise<ParsedDoc> {
  const buf = Buffer.from(await file.arrayBuffer());
  return parseBuffer(buf, file.type, file.name);
}
