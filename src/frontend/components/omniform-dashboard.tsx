"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Download,
  FileText,
  LoaderCircle,
  Presentation,
  Share2,
  Video,
  WandSparkles,
} from "lucide-react";
import { IngestDropzone, type PreparedSource } from "./ingest-dropzone";

type OutputType =
  "presentation" | "advisory" | "video" | "infographic" | "twitter";
type Artifact = {
  output_type: OutputType;
  label: string;
  format: string;
  text: string;
  filename?: string | null;
  download_url?: string | null;
  compiled: boolean;
};
type Result = {
  job_id: string;
  status: "completed" | "partial" | "failed";
  provider: string;
  model: string;
  warnings: string[];
  errors: Record<string, string>;
  artifacts: Artifact[];
};

const formats = [
  {
    id: "presentation",
    label: "Presentation",
    detail: "Compiled PowerPoint",
    icon: Presentation,
  },
  { id: "advisory", label: "Advisory", detail: "Typeset PDF", icon: FileText },
  { id: "video", label: "Video", detail: "Narrated MP4", icon: Video },
  {
    id: "infographic",
    label: "Infographic",
    detail: "Mermaid SVG",
    icon: Share2,
  },
  {
    id: "twitter",
    label: "X thread",
    detail: "Downloadable text",
    icon: WandSparkles,
  },
] satisfies Array<{
  id: OutputType;
  label: string;
  detail: string;
  icon: typeof FileText;
}>;

function proxyDownload(url: string) {
  return url.replace("/api/files/", "/api/omniform/files/");
}

export function OmniFormDashboard() {
  const [prepared, setPrepared] = useState<PreparedSource | null>(null);
  const [selected, setSelected] = useState<OutputType[]>([
    "presentation",
    "advisory",
  ]);
  const [audience, setAudience] = useState("Decision makers");
  const [tone, setTone] = useState("Clear and authoritative");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const sourceText = useMemo(
    () =>
      prepared
        ? [
            prepared.source.text,
            prepared.source.linkText,
            ...prepared.documents.map((document) => document.text),
          ]
            .filter(Boolean)
            .join("\n\n")
        : "",
    [prepared],
  );

  function toggle(id: OutputType) {
    setSelected((current) =>
      current.includes(id)
        ? current.length === 1
          ? current
          : current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function generate() {
    if (!sourceText || !selected.length) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/omniform/transform", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: sourceText.slice(0, 100_000),
          output_types: selected,
          controls: {
            audience,
            tone,
            language: "English",
            detail_level: "standard",
          },
        }),
      });
      const value = await response.json();
      if (!response.ok)
        throw new Error(value.detail ?? value.error ?? "Generation failed.");
      setResult(value);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] bg-[#173f4f] px-5 py-7 text-white sm:px-8 sm:py-9 dark:bg-[#d9ff72] dark:text-[#173f4f]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
          OmniForm AI · Agentic compiler
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          One source. Multiple production-ready files.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 opacity-75">
          LangGraph routes your source to specialized agents, then Marp, Typst,
          Mermaid and FFmpeg compile the results.
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(380px,.9fr)]">
        <section className="orbita-panel p-5 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            1 · Source
          </p>
          <h2 className="mb-5 mt-1 text-lg font-semibold">
            Paste text or upload a PDF
          </h2>
          <IngestDropzone
            onReady={setPrepared}
            onChange={() => setPrepared(null)}
            disabled={busy}
          />
        </section>

        <section className="orbita-panel p-5 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            2 · Output
          </p>
          <h2 className="mt-1 text-lg font-semibold">Choose deliverables</h2>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {formats.map(({ id, label, detail, icon: Icon }) => {
              const active = selected.includes(id);
              return (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={active}
                  key={id}
                  onClick={() => toggle(id)}
                  className={`relative flex items-start gap-3 rounded-2xl border p-3.5 text-left transition ${active ? "border-[#173f4f] bg-[#173f4f]/[0.05] dark:border-[#d9ff72]" : "border-[var(--line)]"}`}
                >
                  <span
                    className={`grid size-9 place-items-center rounded-xl ${active ? "bg-[#173f4f] text-white dark:bg-[#d9ff72] dark:text-[#173f4f]" : "bg-[var(--surface-muted)] text-[var(--muted)]"}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="mt-1 block text-xs text-[var(--muted)]">
                      {detail}
                    </span>
                  </span>
                  {active && (
                    <Check className="absolute right-3 top-3 size-4" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-[var(--muted)]">
              Audience
              <input
                value={audience}
                maxLength={180}
                onChange={(event) => setAudience(event.target.value)}
                className="orbita-input mt-2 h-11 w-full px-3 text-sm text-[var(--foreground)]"
              />
            </label>
            <label className="text-xs font-semibold text-[var(--muted)]">
              Tone
              <input
                value={tone}
                maxLength={80}
                onChange={(event) => setTone(event.target.value)}
                className="orbita-input mt-2 h-11 w-full px-3 text-sm text-[var(--foreground)]"
              />
            </label>
          </div>
          <button
            disabled={busy || sourceText.length < 20}
            onClick={generate}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173f4f] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#d9ff72] dark:text-[#173f4f]"
          >
            {busy ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Agents are generating and compiling…
              </>
            ) : (
              <>
                <WandSparkles className="size-4" />
                Generate {selected.length} deliverable
                {selected.length === 1 ? "" : "s"}
              </>
            )}
          </button>
        </section>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100"
        >
          {error}
        </p>
      )}
      {result && (
        <section className="space-y-4" aria-label="Generated files">
          <div className="orbita-panel p-5">
            <p className="text-sm font-semibold">
              {result.artifacts.length} deliverable
              {result.artifacts.length === 1 ? "" : "s"} generated
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {result.provider} · {result.model} · {result.status}
            </p>
          </div>
          {result.warnings.map((warning) => (
            <p
              key={warning}
              className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
            >
              {warning}
            </p>
          ))}
          {Object.entries(result.errors).map(([output, message]) => (
            <p
              key={output}
              role="alert"
              className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100"
            >
              {message}
            </p>
          ))}
          <div className="grid gap-4 lg:grid-cols-2">
            {result.artifacts.map((artifact) => (
              <article
                key={artifact.output_type}
                className="orbita-panel overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] p-5">
                  <div>
                    <h3 className="font-semibold">{artifact.label}</h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {artifact.compiled ? artifact.filename : artifact.format}
                    </p>
                  </div>
                  {artifact.download_url && (
                    <a
                      href={proxyDownload(artifact.download_url)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#173f4f] px-3 py-2 text-xs font-semibold text-white dark:bg-[#d9ff72] dark:text-[#173f4f]"
                    >
                      <Download className="size-3.5" />
                      Download
                    </a>
                  )}
                </div>
                <pre className="orbita-scrollbar max-h-80 overflow-auto whitespace-pre-wrap p-5 text-xs leading-6 text-[var(--muted)]">
                  {artifact.text}
                </pre>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
