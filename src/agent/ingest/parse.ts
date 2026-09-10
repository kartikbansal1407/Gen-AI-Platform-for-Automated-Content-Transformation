import { z } from "zod";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const documentSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
    "text/csv",
  ]),
  base64: z
    .string()
    .min(1)
    .max(Math.ceil(MAX_FILE_BYTES / 3) * 4)
    .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
  size: z.number().int().positive().max(MAX_FILE_BYTES),
});
export type ParsedDocument = {
  filename: string;
  mimeType: string;
  size: number;
  text: string;
  pages?: number;
  wordCount: number;
  warnings: string[];
};

export async function parseDocument(
  input: z.infer<typeof documentSchema>,
): Promise<ParsedDocument> {
  const { filename, mimeType, base64, size } = documentSchema.parse(input);
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length !== size)
    throw new Error("Document size does not match its contents.");
  let text = "";
  let pages: number | undefined;
  const warnings: string[] = [];
  if (mimeType === "application/pdf") {
    if (
      !filename.toLowerCase().endsWith(".pdf") ||
      buffer.subarray(0, 5).toString() !== "%PDF-"
    )
      throw new Error("Invalid PDF signature or extension.");
    try {
      const parsed = await pdfParse(Uint8Array.from(buffer));
      text = parsed.text;
      pages = parsed.numpages;
    } catch {
      warnings.push(
        "PDF could not be read. For scanned or protected PDFs, paste the text manually.",
      );
    }
  } else if (mimeType.includes("wordprocessingml")) {
    if (
      !filename.toLowerCase().endsWith(".docx") ||
      buffer.readUInt16LE(0) !== 0x4b50
    )
      throw new Error("Invalid DOCX signature or extension.");
    // Bound decompressed ZIP content before handing it to the XML parser.
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    let total = 0;
    for (const entry of Object.values(zip.files)) {
      const data = entry as unknown as {
        _data?: { uncompressedSize?: number };
      };
      total += data._data?.uncompressedSize ?? 0;
    }
    if (total > 30 * 1024 * 1024 || Object.keys(zip.files).length > 2000)
      throw new Error("DOCX decompressed content is too large.");
    if (!zip.file("word/document.xml"))
      throw new Error("Invalid DOCX structure.");
    try {
      text = (await mammoth.extractRawText({ buffer })).value;
    } catch {
      warnings.push("DOCX could not be read. Paste the text manually.");
    }
  } else {
    if (!/\.(txt|md|csv)$/i.test(filename) || buffer.includes(0))
      throw new Error("Invalid text document.");
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  }
  text = text.trim();
  if (text.length > 50000)
    warnings.push("Document truncated to 50,000 characters.");
  text = text.slice(0, 50000);
  if (!text)
    warnings.push("No text extracted. Paste readable text before generating.");
  return {
    filename,
    mimeType,
    size,
    text,
    pages,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    warnings,
  };
}

export async function parseDocuments(
  inputs: Array<z.infer<typeof documentSchema>>,
) {
  if (inputs.length > 10) throw new Error("Maximum 10 documents per job.");
  return Promise.all(inputs.map(parseDocument));
}
