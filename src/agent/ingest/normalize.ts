import type { SourceContent, ImageInput, VideoInput } from "../transform-types";
import type { ParsedDocument } from "./parse";
import { sourceText } from "@/lib/output-format";
export type SourceBundle = SourceContent;
export type NormalizeInput = {
  text?: string;
  prompt?: string;
  documents?: ParsedDocument[];
  images?: ImageInput[];
  video?: VideoInput;
  link?: { url: string; text: string; images: ImageInput[]; title?: string };
  metadata?: Record<string, string>;
};
export function normalizeSourceBundle(input: NormalizeInput): SourceContent {
  if ((input.images?.length ?? 0) > 5 || (input.documents?.length ?? 0) > 10)
    throw new Error("Too many source attachments.");
  return {
    text:
      [input.prompt?.trim(), input.text?.trim()].filter(Boolean).join("\n\n") ||
      undefined,
    documents: input.documents?.map((d) => d.text),
    images: input.images,
    video: input.video,
    linkUrl: input.link?.url,
    linkText: input.link?.text,
    linkImages: input.link?.images.slice(
      0,
      Math.max(0, 5 - (input.images?.length ?? 0)),
    ),
    metadata: {
      ...input.metadata,
      ...(input.link?.title ? { linkTitle: input.link.title } : {}),
    },
  };
}
export function summarizeBundle(source: SourceContent) {
  return sourceText(source).slice(0, 300).replace(/\s+/g, " ").trim();
}
