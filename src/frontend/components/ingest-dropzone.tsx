"use client";
import { useState } from "react";
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
    if (incoming.some((f) => f.size > 10485760)) {
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
      files.forEach((f) => form.append("files", f));
      const response = await fetch("/api/ingest", {
        method: "POST",
        body: form,
      });
      const value = await response.json();
      if (!response.ok)
        throw new Error(value.error ?? "Unable to read source.");
      setPrepared(value);
      onReady(value);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to read source.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset disabled={disabled || busy} className="space-y-3">
      <legend className="mb-3 font-semibold">Source intake</legend>
      <label className="block text-sm">
        Source text
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            invalidate();
          }}
          placeholder="Paste a report, article, advisory, or other source text"
          className="mt-1 min-h-32 w-full rounded border border-current/20 bg-transparent p-3"
        />
      </label>
      <label className="block text-sm">
        Prompt or context
        <textarea
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            invalidate();
          }}
          placeholder="Describe the communication you need"
          className="mt-1 min-h-16 w-full rounded border border-current/20 bg-transparent p-2"
        />
      </label>
      <label className="block text-sm">
        Source URL
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            invalidate();
          }}
          placeholder="https://example.org/report"
          className="mt-1 h-9 w-full rounded border border-current/20 bg-transparent px-2"
        />
      </label>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!disabled && !busy) addFiles(Array.from(e.dataTransfer.files));
        }}
        className="rounded border border-dashed border-current/30 p-4 text-sm"
      >
        <label>
          Upload source files
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.mp4,.webm"
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
            className="mt-2 block w-full"
          />
        </label>
        <p className="mt-2 text-xs opacity-60">
          Drop documents, images or video here. Up to 10 documents, 5 images and
          1 video; 10 MB each, 40 MB total.
        </p>
      </div>
      {files.map((file, i) => (
        <div key={`${file.name}-${i}`} className="flex justify-between text-sm">
          <span>
            {file.name} · {Math.ceil(file.size / 1024)} KB
          </span>
          <button
            type="button"
            onClick={() => {
              setFiles(files.filter((_, index) => index !== i));
              invalidate();
            }}
            aria-label={`Remove ${file.name}`}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={prepare}
        disabled={
          busy ||
          !Boolean(text.trim() || prompt.trim() || url.trim() || files.length)
        }
        className="rounded border border-current/30 px-4 py-2 text-sm disabled:opacity-40"
      >
        {busy ? "Reading source…" : "Prepare source"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
      {prepared && (
        <section
          aria-label="Source preview"
          className="rounded border border-current/20 p-3 text-sm"
        >
          <h3 className="font-semibold">Source ready</h3>
          {prepared.documents.map((doc) => (
            <p key={doc.filename}>
              {doc.filename}: {doc.wordCount} words
              {doc.pages ? `, ${doc.pages} pages` : ""}
            </p>
          ))}
          <p>
            {prepared.source.images?.length ?? 0} uploaded images
            {prepared.source.video ? " · Video attached; no autoplay" : ""}
          </p>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-sans text-xs">
            {prepared.preview || "Media will be analyzed during generation."}
          </pre>
          {prepared.warnings.map((w) => (
            <p key={w} className="mt-2 text-amber-600">
              {w}
            </p>
          ))}
        </section>
      )}
    </fieldset>
  );
}
