import type { SourceBundle } from "../types";

export function normalizeSourceBundle(input: {
  text?: string;
  prompt?: string;
  docs?: { filename: string; mime: string; text: string }[];
  urlMeta?: { url: string; title?: string; text?: string } | null;
  images?: { filename: string; mime: string }[];
  video?: { filename: string; mime: string } | null;
}): SourceBundle {
  // Aggressively strip PDF binary garbage: drop any line that looks like
  // "%PDF", "obj ... stream", "o !<#$jqxK1F", "G:\Projects..." leak, etc.
  const isGarbageLine = (l: string) => {
    const t = l.trim();
    if (!t) return true;
    if (t.length < 25) return false; // keep short legit lines, filter later
    if (/%PDF|endobj|endstream|xref|trailer|FlateDecode|\/Length|\/Filter|<<\//.test(t)) return true;
    if (/fake worker|Cannot find module|G:\\Projects|Gen-AI-Platform.*\.next|parse error/i.test(t)) return true;
    // symbol-density check: lines like "o !<#$jqxK1F 1xGL |@T" have >35% symbols
    const symbols = (t.match(/[^a-zA-Z0-9\s.,;:!?'"()\-–—%$]/g) || []).length;
    if (symbols / Math.max(1, t.length) > 0.3) return true;
    // must contain at least one English word (4+ letters)
    if (!/[a-zA-Z]{4,}/.test(t)) return true;
    return false;
  };
  const sanitize = (s: string) => {
    if (!s) return s;
    const lines = s.split("\n");
    const kept = lines.filter((l) => !isGarbageLine(l));
    // If we dropped >60% of content, the doc was mostly binary — keep readable remainder
    const out = kept.join("\n").replace(/[^\x09\x0A\x0D\x20-\x7E\u0900-\u097F\u00A0-\u00FF\n]/g, " ").replace(/[ \t]+/g, " ").trim().slice(0, 15000);
    if (!out || out.length < 60) {
      const fallbackLines = lines.filter((l) => l.trim().length > 40 && /[a-zA-Z]{4,}/.test(l)).slice(0, 20).join("\n").slice(0, 3000);
      return fallbackLines || `[Document contained only binary data — no extractable text. Please use a text-based PDF or paste text manually.]`;
    }
    return out;
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
