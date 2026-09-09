import type { SourceBundle } from "../types";

export function normalizeSourceBundle(input: {
  text?: string;
  prompt?: string;
  docs?: { filename: string; mime: string; text: string }[];
  urlMeta?: { url: string; title?: string; text?: string } | null;
  images?: { filename: string; mime: string }[];
  video?: { filename: string; mime: string } | null;
}): SourceBundle {
  // Strip obvious binary PDF garbage that slipped through (e.g. "%PDF-1.4 ... stream ...")
  const sanitize = (s: string) => {
    if (!s) return s;
    const hasPdfHeader = s.includes("%PDF") && s.includes("obj") && s.includes("stream");
    const binaryRatio = (s.match(/[\x00-\x08\x0B\x0C\x0E-\x1F�]/g)?.length ?? 0) / Math.max(1, s.length);
    if (hasPdfHeader || binaryRatio > 0.05) {
      // keep only printable lines longer than 12 chars
      const cleaned = s.split("\n").filter((l) => l.trim().length > 12 && !l.includes("%PDF") && !l.includes("<<") ).join("\n").slice(0, 15000);
      return cleaned || `[Document contained only binary PDF data — no extractable text. Please use a text-based PDF.]`;
    }
    return s.slice(0, 15000);
  };
  const docs = (input.docs ?? []).map((d) => ({ ...d, text: sanitize(d.text) }));
  const combinedText = [
    sanitize(input.text?.trim() || ""),
    input.prompt?.trim() ? `Operator prompt: ${input.prompt.trim()}` : "",
    input.urlMeta?.text ? `URL (${input.urlMeta.url}): ${sanitize(input.urlMeta.text).slice(0, 15000)}` : "",
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
