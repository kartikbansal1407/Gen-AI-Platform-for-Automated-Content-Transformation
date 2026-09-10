"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Clipboard,
  Download,
  ExternalLink,
  FileJson,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { Artefact } from "@/lib/job-types";
import { downloadFile } from "@/lib/exports";

function safeLink(url: unknown) {
  if (typeof url !== "string") return undefined;
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

const actionClass =
  "inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]";

export function ArtefactPreview({
  artefact,
  onRefine,
}: {
  artefact: Artefact;
  onRefine?: (instruction: string) => Promise<void>;
}) {
  const [instruction, setInstruction] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const audio = artefact.metadata.videoNarration as { audioBase64?: string } | undefined;
  const deck = artefact.metadata.presentationDeck as { downloadUrl?: string } | undefined;
  const image = artefact.metadata.generatedImage as { imageBase64?: string } | undefined;
  const deckUrl = safeLink(deck?.downloadUrl);
  const uniqueWarnings = [...new Set(artefact.warnings)];

  return (
    <article aria-label={`${artefact.type} artefact`} className="orbita-panel overflow-hidden">
      <div className="border-b border-[var(--line)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Generated deliverable
            </p>
            <h3 className="text-xl font-semibold tracking-[-0.025em]">{artefact.title}</h3>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {artefact.mode ?? "saved"} · Confidence {artefact.confidence}%
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)]">
            <ShieldCheck className="size-3.5" />Review before use
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className={actionClass}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(artefact.body);
                setMessage("Copied to clipboard.");
              } catch {
                setMessage("Clipboard unavailable; download Markdown instead.");
              }
            }}
          >
            <Clipboard className="size-3.5" />Copy
          </button>
          <button className={actionClass} onClick={() => downloadFile(artefact.body, `${artefact.type}.md`)}>
            <Download className="size-3.5" />Markdown
          </button>
          <button
            className={actionClass}
            onClick={() => downloadFile(JSON.stringify(artefact, null, 2), `${artefact.type}.json`, "application/json")}
          >
            <FileJson className="size-3.5" />JSON
          </button>
          {typeof artefact.metadata.srt === "string" && (
            <button className={actionClass} onClick={() => downloadFile(String(artefact.metadata.srt), "subtitles.srt", "text/plain")}>
              <Download className="size-3.5" />SRT
            </button>
          )}
          {typeof artefact.metadata.vtt === "string" && (
            <button className={actionClass} onClick={() => downloadFile(String(artefact.metadata.vtt), "subtitles.vtt", "text/vtt")}>
              <Download className="size-3.5" />VTT
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 p-5 sm:p-6">
          <pre className="orbita-scrollbar max-h-[720px] overflow-auto whitespace-pre-wrap rounded-2xl bg-[var(--background)] p-5 font-sans text-sm leading-7 text-[var(--foreground)]">
            {artefact.body}
          </pre>

          {audio?.audioBase64 && (
            <div className="mt-5 rounded-2xl border border-[var(--line)] p-4">
              <p className="mb-3 text-xs font-semibold text-[var(--muted)]">Generated narration</p>
              <audio controls src={`data:audio/mpeg;base64,${audio.audioBase64}`} className="w-full" />
            </div>
          )}

          {image?.imageBase64 && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--background)] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- Generated base64 image has no remote optimization source. */}
              <img src={`data:image/png;base64,${image.imageBase64}`} alt="Generated infographic" className="mx-auto max-h-[520px] object-contain" />
            </div>
          )}

          {deckUrl && (
            <a href={deckUrl} target="_blank" rel="noreferrer" className={`${actionClass} mt-5`}>
              <ExternalLink className="size-3.5" />Open PowerPoint
            </a>
          )}
        </section>

        <aside className="border-t border-[var(--line)] bg-[var(--background)] p-5 sm:p-6 xl:border-l xl:border-t-0">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Source attribution</p>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{artefact.sourceAttribution}</p>
          </div>

          <div className="mt-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Review warnings</p>
            {uniqueWarnings.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {uniqueWarnings.map((warning) => (
                  <li key={warning} className="flex gap-2 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{warning}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-[var(--muted)]">No generated warnings.</p>
            )}
          </div>

          <details className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-xs">
            <summary className="cursor-pointer font-semibold">Inspect supporting evidence</summary>
            <div className="mt-3 space-y-3">
              {artefact.claimSupport?.length ? artefact.claimSupport.map((claim, index) => (
                <div key={index} className="rounded-lg bg-[var(--background)] p-3">
                  <p className="font-semibold">{claim.claim}</p>
                  <p className={`mt-1 text-[11px] font-semibold ${claim.supported ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
                    {claim.supported ? "Source span matched" : "Needs review"}
                  </p>
                  <p className="mt-2 leading-5 text-[var(--muted)]">{claim.sourceEvidence}</p>
                </div>
              )) : <p className="text-[var(--muted)]">No structured claim evidence was returned.</p>}
            </div>
          </details>

          {onRefine && (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                setMessage("");
                try {
                  await onRefine(instruction);
                  setMessage("Artefact updated.");
                  setInstruction("");
                } catch {
                  setMessage("Refinement failed; your previous artefact is preserved.");
                } finally {
                  setBusy(false);
                }
              }}
              className="mt-6"
            >
              <label className="block text-xs font-semibold">
                Refine this artefact
                <textarea
                  required
                  minLength={3}
                  maxLength={2000}
                  value={instruction}
                  onChange={(event) => setInstruction(event.target.value)}
                  placeholder="Make this more concise and executive-ready"
                  className="orbita-input mt-2 min-h-24 w-full resize-y p-3 text-sm font-normal outline-none"
                />
              </label>
              <button disabled={busy} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#173f4f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f303d] disabled:opacity-50 dark:bg-[#d9ff72] dark:text-[#173f4f] dark:hover:bg-[#efffb9]">
                <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />{busy ? "Refining…" : "Refine deliverable"}
              </button>
            </form>
          )}

          {message && <p role="status" className="mt-4 rounded-xl bg-[var(--surface)] p-3 text-xs text-[var(--muted)]">{message}</p>}
        </aside>
      </div>
    </article>
  );
}
