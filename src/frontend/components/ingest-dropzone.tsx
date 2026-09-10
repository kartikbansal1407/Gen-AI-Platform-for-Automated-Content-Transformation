"use client";

import { useState } from "react";
import { CheckCircle2, FilePlus2, Link2, LoaderCircle, Trash2, UploadCloud } from "lucide-react";
import type { SourceContent } from "@/agent/transform-types";
import type { ParsedDocument } from "@/agent/ingest/parse";

export type PreparedSource = {
  source: SourceContent;
  documents: ParsedDocument[];
  warnings: string[];
  preview: string;
};

export function IngestDropzone({
  onReady,
  onChange,
  disabled,
}: {
  onReady: (value: PreparedSource) => void;
  onChange: () => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [prepared, setPrepared] = useState<PreparedSource | null>(null);

  function invalidate() {
    setPrepared(null);
    onChange();
  }

  function addFiles(incoming: File[]) {
    invalidate();
    setError("");
    if (incoming.some((file) => file.size > 10485760)) {
      setError("Each file must be 10 MB or smaller.");
      return;
    }
    setFiles((old) => [...old, ...incoming]);
  }

  async function prepare() {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("text", text);
      form.set("prompt", prompt);
      form.set("url", url);
      files.forEach((file) => form.append("files", file));
      const response = await fetch("/api/ingest", { method: "POST", body: form });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error ?? "Unable to read source.");
      setPrepared(value);
      onReady(value);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to read source.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset disabled={disabled || busy} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block text-xs font-semibold text-[var(--muted)] lg:col-span-2">
          Source text
          <textarea
            value={text}
            onChange={(event) => { setText(event.target.value); invalidate(); }}
            placeholder="Paste a report, article, advisory, research note, or other source text"
            className="orbita-input mt-2 min-h-36 w-full resize-y p-3.5 text-sm font-normal leading-6 outline-none"
          />
        </label>

        <label className="block text-xs font-semibold text-[var(--muted)]">
          Prompt or context
          <textarea
            value={prompt}
            onChange={(event) => { setPrompt(event.target.value); invalidate(); }}
            placeholder="What do you want Orbita to produce or emphasize?"
            className="orbita-input mt-2 min-h-24 w-full resize-y p-3 text-sm font-normal leading-6 outline-none"
          />
        </label>

        <label className="block text-xs font-semibold text-[var(--muted)]">
          Source URL
          <span className="orbita-input mt-2 flex h-11 items-center gap-2 px-3">
            <Link2 className="size-4 shrink-0 text-[var(--muted)]" />
            <input
              type="url"
              value={url}
              onChange={(event) => { setUrl(event.target.value); invalidate(); }}
              placeholder="https://example.org/report"
              className="min-w-0 flex-1 bg-transparent text-sm font-normal outline-none"
            />
          </span>
        </label>
      </div>

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!disabled && !busy) addFiles(Array.from(event.dataTransfer.files));
        }}
        className="rounded-2xl border border-dashed border-[#aab9bf] bg-[var(--background)] p-5 text-center transition hover:border-[#7895a1]"
      >
        <span className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-[var(--surface)] text-[var(--muted)] shadow-sm">
          <UploadCloud className="size-5" />
        </span>
        <p className="text-sm font-semibold">Drop source files here</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">PDF, DOCX, text, CSV, images, MP4 or WebM · 10 MB each · 40 MB total</p>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold transition hover:bg-[var(--surface-muted)]">
          <FilePlus2 className="size-4" />Choose files
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.mp4,.webm"
            onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }}
            className="sr-only"
          />
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--surface-muted)] text-[var(--muted)]"><FilePlus2 className="size-3.5" /></span>
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{file.name}</p><p className="mt-0.5 text-[10px] text-[var(--muted)]">{Math.ceil(file.size / 1024)} KB</p></div>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => { setFiles(files.filter((_, itemIndex) => itemIndex !== index)); invalidate(); }}
                className="rounded-lg p-2 text-[var(--muted)] hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={prepare}
        disabled={busy || !Boolean(text.trim() || prompt.trim() || url.trim() || files.length)}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-semibold transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? <><LoaderCircle className="size-4 animate-spin" />Reading source…</> : <><CheckCircle2 className="size-4" />Prepare source</>}
      </button>

      {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">{error}</p>}

      {prepared && (
        <section aria-label="Source preview" className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300"><CheckCircle2 className="size-4" />Source ready</div>
          <div className="space-y-1 text-xs text-[var(--muted)]">
            {prepared.documents.map((doc) => <p key={doc.filename}>{doc.filename}: {doc.wordCount} words{doc.pages ? `, ${doc.pages} pages` : ""}</p>)}
            <p>{prepared.source.images?.length ?? 0} uploaded images{prepared.source.video ? " · Video attached; no autoplay" : ""}</p>
          </div>
          <pre className="orbita-scrollbar mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-[var(--surface)] p-3 font-sans text-xs leading-5 text-[var(--muted)]">{prepared.preview || "Media will be analyzed during generation."}</pre>
          {prepared.warnings.map((warning) => <p key={warning} className="mt-2 text-xs text-amber-700 dark:text-amber-300">{warning}</p>)}
        </section>
      )}
    </fieldset>
  );
}
