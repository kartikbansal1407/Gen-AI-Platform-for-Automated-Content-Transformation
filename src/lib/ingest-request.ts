import { z } from "zod";
import {
  parseDocument,
  MAX_FILE_BYTES,
  type ParsedDocument,
} from "@/agent/ingest/parse";
import {
  sourceContentSchema,
  type SourceContent,
  type ImageInput,
} from "@/agent/transform-types";
import { fetchAndEnrichSourceWithLink } from "@/agent/ingestion";
import { readBoundedBody } from "./api-guard";

export function validateMedia(bytes: Buffer, mime: string) {
  if (!bytes.length || bytes.length > MAX_FILE_BYTES)
    throw new Error("Files must be between 1 byte and 10 MB.");
  const valid =
    mime === "image/png"
      ? bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : mime === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : mime === "image/webp"
          ? bytes.subarray(0, 4).toString() === "RIFF" &&
            bytes.subarray(8, 12).toString() === "WEBP"
          : mime === "video/mp4"
            ? bytes.subarray(4, 8).toString() === "ftyp"
            : mime === "video/webm"
              ? bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]))
              : false;
  if (!valid) throw new Error("Unsupported or mismatched media contents.");
}

export function validateSourceMedia(source: SourceContent) {
  for (const media of [
    ...(source.images ?? []),
    ...(source.linkImages ?? []),
    ...(source.video?.keyframes ?? []),
    ...(source.video ? [source.video] : []),
  ]) {
    if (media.base64)
      validateMedia(Buffer.from(media.base64, "base64"), media.mimeType ?? "");
  }
}

export async function readIngestRequest(
  request: Request,
): Promise<{
  source: SourceContent;
  documents: ParsedDocument[];
  fields: Record<string, unknown>;
  warnings: string[];
}> {
  const bytes = await readBoundedBody(request);
  let source: SourceContent;
  const documents: ParsedDocument[] = [];
  let fields: Record<string, unknown>;
  const warnings: string[] = [];
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await new Response(bytes, {
      headers: { "Content-Type": request.headers.get("content-type")! },
    }).formData();
    fields = {};
    for (const key of ["controls", "outputTypes", "overrides"]) {
      const raw = form.get(key);
      if (typeof raw === "string") fields[key] = JSON.parse(raw);
    }
    if (typeof form.get("outputType") === "string")
      fields.outputType = form.get("outputType");
    const files = Array.from(form.values()).filter(
      (v): v is File => typeof v !== "string",
    );
    if (files.reduce((sum, file) => sum + file.size, 0) > 40 * 1024 * 1024)
      throw new Error("Combined files exceed 40 MB.");
    if (files.length > 16) throw new Error("Too many files.");
    const images: ImageInput[] = [];
    let video: SourceContent["video"];
    for (const file of files) {
      if (!file.size || file.size > MAX_FILE_BYTES)
        throw new Error(`${file.name}: maximum 10 MB per file.`);
      const bytes = Buffer.from(await file.arrayBuffer());
      const mime =
        file.type ||
        (/\.md$/i.test(file.name)
          ? "text/markdown"
          : /\.txt$/i.test(file.name)
            ? "text/plain"
            : "");
      if (mime.startsWith("image/") || mime.startsWith("video/")) {
        validateMedia(bytes, mime);
        const media = { base64: bytes.toString("base64"), mimeType: mime };
        if (mime.startsWith("image/"))
          images.push({ ...media, altText: file.name });
        else {
          if (video) throw new Error("Maximum one video per job.");
          video = media;
        }
      } else {
        documents.push(
          await parseDocument({
            filename: file.name,
            mimeType: mime as Parameters<typeof parseDocument>[0]["mimeType"],
            base64: bytes.toString("base64"),
            size: file.size,
          }),
        );
      }
    }
    if (documents.length > 10 || images.length > 5)
      throw new Error("Maximum 10 documents and 5 images per job.");
    source = {
      text: [form.get("text"), form.get("prompt")]
        .filter((v) => typeof v === "string")
        .join("\n\n"),
      linkUrl: String(form.get("url") ?? "") || undefined,
      documents: documents.map((d) => d.text),
      images,
      video,
    };
    warnings.push(
      ...documents.flatMap((d) => d.warnings.map((w) => `${d.filename}: ${w}`)),
    );
  } else {
    fields = z
      .record(z.string(), z.unknown())
      .parse(JSON.parse(bytes.toString("utf8")));
    source = sourceContentSchema.parse(fields.source ?? fields);
  }
  // Empty/scanned document uploads still return their warnings in preview.
  if (
    !source.text?.trim() &&
    !source.documents?.some(Boolean) &&
    !source.linkUrl &&
    !source.images?.length &&
    !source.video &&
    documents.length
  )
    return { source, documents, fields, warnings };
  source = sourceContentSchema.parse(source);
  validateSourceMedia(source);
  if (source.linkUrl && !source.linkText) {
    try {
      source = await fetchAndEnrichSourceWithLink(source);
    } catch (error) {
      if (
        !source.text?.trim() &&
        !source.documents?.some(Boolean) &&
        !source.images?.length &&
        !source.video
      )
        throw error;
      warnings.push(
        "URL could not be read; the remaining sources are available. Check the address or paste its text.",
      );
      source = { ...source, linkUrl: undefined };
    }
  }
  return { source, documents, fields, warnings };
}
