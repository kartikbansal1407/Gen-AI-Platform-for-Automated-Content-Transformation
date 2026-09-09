import type { SourceBundle } from "../types";

export function normalizeSourceBundle(input: {
  text?: string;
  prompt?: string;
  docs?: { filename: string; mime: string; text: string }[];
  urlMeta?: { url: string; title?: string; text?: string } | null;
  images?: { filename: string; mime: string }[];
  video?: { filename: string; mime: string } | null;
}): SourceBundle {
  const docs = input.docs ?? [];
  const combinedText = [
    input.text?.trim(),
    input.prompt?.trim() ? `Operator prompt: ${input.prompt.trim()}` : "",
    input.urlMeta?.text ? `URL (${input.urlMeta.url}): ${input.urlMeta.text.slice(0, 15000)}` : "",
    ...docs.map((d) => `Document ${d.filename}: ${d.text.slice(0, 15000)}`),
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 60000);

  return {
    text: combinedText || input.text || "",
    prompt: input.prompt,
    docs,
    images: input.images ?? [],
    video: input.video ?? null,
    urlMeta: input.urlMeta ?? null,
  };
}

export function bundleSummary(bundle: SourceBundle): string {
  return bundle.text.slice(0, 600);
}
