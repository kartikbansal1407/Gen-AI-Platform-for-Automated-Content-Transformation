"use client";
import { useState } from "react";
import type { Artefact } from "@/lib/job-types";
import { downloadFile } from "@/lib/exports";
function safeLink(url: unknown) {
  if (typeof url !== "string") return undefined;
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol)
      ? parsed.href
      : undefined;
  } catch {
    return undefined;
  }
}
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
  const audio = artefact.metadata.videoNarration as
    { audioBase64?: string } | undefined;
  const deck = artefact.metadata.presentationDeck as
    { downloadUrl?: string } | undefined;
  const image = artefact.metadata.generatedImage as
    { imageBase64?: string } | undefined;
  return (
    <article
      aria-label={`${artefact.type} artefact`}
      className="space-y-4 rounded-lg border border-current/15 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{artefact.title}</h3>
        <span className="text-xs opacity-60">
          {artefact.mode ?? "saved"} · Confidence {artefact.confidence}%
        </span>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(artefact.body);
              setMessage("Copied.");
            } catch {
              setMessage("Clipboard unavailable; download Markdown instead.");
            }
          }}
        >
          Copy
        </button>
        <button
          onClick={() => downloadFile(artefact.body, `${artefact.type}.md`)}
        >
          Download Markdown
        </button>
        <button
          onClick={() =>
            downloadFile(
              JSON.stringify(artefact, null, 2),
              `${artefact.type}.json`,
              "application/json",
            )
          }
        >
          Download JSON
        </button>
        {typeof artefact.metadata.srt === "string" && (
          <button
            onClick={() =>
              downloadFile(
                String(artefact.metadata.srt),
                "subtitles.srt",
                "text/plain",
              )
            }
          >
            Download SRT
          </button>
        )}
        {typeof artefact.metadata.vtt === "string" && (
          <button
            onClick={() =>
              downloadFile(
                String(artefact.metadata.vtt),
                "subtitles.vtt",
                "text/vtt",
              )
            }
          >
            Download VTT
          </button>
        )}
      </div>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-6">
        {artefact.body}
      </pre>
      {audio?.audioBase64 && (
        <audio
          controls
          src={`data:audio/mpeg;base64,${audio.audioBase64}`}
          className="w-full"
        />
      )}
      {safeLink(deck?.downloadUrl) && (
        <a
          href={safeLink(deck?.downloadUrl)}
          target="_blank"
          rel="noreferrer"
          className="text-sm underline"
        >
          Download PowerPoint
        </a>
      )}
      {image?.imageBase64 && (
        // eslint-disable-next-line @next/next/no-img-element -- Generated base64 image has no remote optimization source.
        <img
          src={`data:image/png;base64,${image.imageBase64}`}
          alt="Generated infographic"
          className="max-h-96 object-contain"
        />
      )}
      <p className="text-xs opacity-70">{artefact.sourceAttribution}</p>
      {artefact.warnings.length > 0 && (
        <ul className="list-disc space-y-1 pl-4 text-xs text-amber-600">
          {[...new Set(artefact.warnings)].map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <details className="text-xs">
        <summary>Inspect supporting evidence</summary>
        {artefact.claimSupport?.map((claim, i) => (
          <p key={i} className="mt-2">
            {claim.claim} —{" "}
            {claim.supported ? "Source span matched" : "Needs review"}
            <br />
            {claim.sourceEvidence}
          </p>
        ))}
      </details>
      {onRefine && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await onRefine(instruction);
              setMessage("Artefact updated.");
              setInstruction("");
            } catch {
              setMessage(
                "Refinement failed; your previous artefact is preserved.",
              );
            } finally {
              setBusy(false);
            }
          }}
          className="flex gap-2"
        >
          <label className="flex-1 text-sm">
            Refine this artefact
            <input
              required
              minLength={3}
              maxLength={2000}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Make the advisory more formal"
              className="mt-1 h-9 w-full rounded border border-current/20 bg-transparent px-2"
            />
          </label>
          <button
            disabled={busy}
            className="self-end rounded border border-current/20 px-3 py-2 text-sm"
          >
            {busy ? "Refining…" : "Refine"}
          </button>
        </form>
      )}
      {message && (
        <p role="status" className="text-xs">
          {message}
        </p>
      )}
    </article>
  );
}
