"use client";
import { useRef, useState, useCallback } from "react";

type Doc = { filename: string; mime: string; text: string };

const ACCEPT = ".pdf,.pptx,.ppt,.docx,.doc,.txt,.md,.csv,.rtf,image/*";

function isBinaryDoc(name: string, type: string) {
  const lower = name.toLowerCase();
  return lower.endsWith(".pdf") || lower.endsWith(".docx") || lower.endsWith(".doc") || lower.endsWith(".pptx") || lower.endsWith(".ppt") || type === "application/pdf" || type.includes("presentation") || type.includes("wordprocessing");
}

export function IngestDropzone({
  text,
  setText,
  url,
  setUrl,
  docs,
  setDocs,
}: {
  text: string; setText: (v: string) => void; url: string; setUrl: (v: string) => void;
  docs: Doc[]; setDocs: (d: Doc[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseFiles = useCallback(async (files: FileList | File[]) => {
    setError(null); setParsing(true);
    const newDocs: Doc[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 25 * 1024 * 1024) { setError(`${file.name} too large (max 25 MB)`); continue; }
      try {
        if (file.type.startsWith("text/") || /\.(txt|md|csv|rtf)$/i.test(file.name)) {
          const t = await file.text();
          if (!t.trim()) throw new Error("Empty text file");
          newDocs.push({ filename: file.name, mime: file.type || "text/plain", text: t.slice(0, 80000) });
        } else if (file.type.startsWith("image/")) {
          newDocs.push({ filename: file.name, mime: file.type, text: `[Image ${file.name} — will be analyzed via Gemini vision if key set]` });
        } else if (isBinaryDoc(file.name, file.type)) {
          // Server-side parse via /api/ingest — ensures proper PDF/DOCX/PPT extraction, no binary garbage
          const form = new FormData();
          form.append("file", file);
          const res = await fetch("/api/ingest", { method: "POST", body: form });
          const data = await res.json() as { text?: string; filename?: string; mime?: string; error?: string; warning?: string };
          if (!res.ok) throw new Error(data.error || "Parse failed");
          const parsedText = (data.text || "").trim();
          if (!parsedText) throw new Error("No text could be extracted — file may be scanned or empty");
          if (parsedText.includes("%PDF") && parsedText.includes("<<") && parsedText.length < 2000) {
            throw new Error("PDF text extraction returned binary — try a text-based PDF");
          }
          if (data.warning) setError((prev) => prev ? `${prev}; ${file.name}: ${data.warning}` : `${file.name}: ${data.warning}`);
          newDocs.push({ filename: data.filename || file.name, mime: data.mime || file.type || "application/octet-stream", text: parsedText.slice(0, 80000) });
        } else {
          // fallback: try text
          const t = await file.text().catch(() => "");
          newDocs.push({ filename: file.name, mime: file.type || "application/octet-stream", text: t.slice(0, 80000) || `[File ${file.name}]` });
        }
      } catch (e) { setError(`Failed ${file.name}: ${(e as Error).message}`); }
    }
    if (newDocs.length) setDocs([...docs, ...newDocs]);
    setParsing(false);
  }, [docs, setDocs]);

  return (
    <div className={`rounded-lg border p-4 ${dragOver ? "border-teal-500 bg-teal-500/5" : "border-current/10"}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) parseFiles(e.dataTransfer.files); }}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Source Intake — drag & drop, browse, or paste</h3>
        <button onClick={() => inputRef.current?.click()} className="h-8 rounded-md border border-current/15 px-3 text-xs">Browse files</button>
      </div>
      <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => { if (e.target.files) parseFiles(e.target.files); e.currentTarget.value = ""; }} />
      <div className="mt-3 rounded-md border border-dashed border-current/15 bg-current/[0.02] p-4 text-center text-sm">
        <p className="opacity-70">Drop <b>PDFs, PPTs, DOCX, TXT, MD, CSV, images</b> here — or click Browse.</p>
        <p className="mt-1 text-xs opacity-50">Text is extracted server-side (pdf-parse / mammoth / jszip) — no binary garbage. 25 MB per file.</p>
      </div>
      {docs.length > 0 && (
        <div className="mt-3 space-y-2">
          {docs.map((d, i) => (
            <div key={i} className="flex items-start justify-between gap-2 rounded-md border border-current/10 bg-white/60 p-2 text-xs dark:bg-white/[0.04]">
              <span className="min-w-0 flex-1"><b className="break-all">{d.filename}</b> — {d.mime} — {d.text.length} chars
                <span className="mt-1 block line-clamp-2 break-all opacity-60">{d.text.slice(0, 160).replace(/\s+/g, " ")}{d.text.length > 160 ? "…" : ""}</span>
              </span>
              <button onClick={() => setDocs(docs.filter((_, j) => j !== i))} className="shrink-0 rounded border px-2 py-1 text-xs">Remove</button>
            </div>
          ))}
        </div>
      )}
      <textarea value={text} onChange={(e) => setText(e.target.value)} className="mt-3 min-h-28 w-full rounded-md border border-current/10 bg-transparent p-3 text-sm" placeholder="Paste source text / prompt (used together with files + URL)" />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL (optional — will be fetched server-side)" className="mt-3 w-full rounded-md border border-current/10 bg-transparent p-2 text-sm" />
      {parsing && <p className="mt-2 text-xs opacity-60">Parsing files…</p>}
      {error && <p className="mt-2 text-xs text-amber-600 whitespace-pre-wrap">{error}</p>}
    </div>
  );
}
