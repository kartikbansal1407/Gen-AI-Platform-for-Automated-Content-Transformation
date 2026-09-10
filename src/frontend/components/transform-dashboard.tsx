"use client";
import { useState } from "react";
import { IngestDropzone, type PreparedSource } from "./ingest-dropzone";
import { ControlsPanel, defaultControls } from "./controls-panel";
import { OutputSelector, outputOptions } from "./output-selector";
import { ArtefactPreview } from "./artefact-preview";
import type { OperatorControls, OutputType } from "@/agent/transform-types";
import type {
  Artefact,
  TransformationJob,
  TransformEvent,
} from "@/lib/job-types";
import { buildJobZip, downloadFile } from "@/lib/exports";
import { saveBrowserJob } from "@/lib/browser-jobs";

export function JobPreview({
  job,
  onUpdate,
}: {
  job: TransformationJob;
  onUpdate?: (job: TransformationJob) => void;
}) {
  const [selected, setSelected] = useState<OutputType>(
    job.artefacts[0]?.type ?? "executive_summary",
  );
  const [error, setError] = useState("");
  const artefact =
    job.artefacts.find((a) => a.type === selected) ?? job.artefacts[0];
  async function refine(instruction: string) {
    if (!artefact) return;
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: job.id,
        artefactType: artefact.type,
        instruction,
        previousArtefact: artefact.metadata,
        source: job.source,
        controls: { ...job.controls, ...job.overrides[artefact.type] },
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    const next = {
      ...job,
      artefacts: job.artefacts.map((a) =>
        a.type === artefact.type ? result.artefact : a,
      ),
    };
    try {
      saveBrowserJob(next);
    } catch {
      setError(
        "Browser storage is full. Download this job to preserve changes.",
      );
    }
    onUpdate?.(next);
  }
  return (
    <section className="space-y-4" aria-label="Generated artefacts">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">
          {job.artefacts.length} artefacts · {job.status}
        </h2>
        <button
          className="text-sm underline"
          onClick={async () => {
            try {
              downloadFile(
                new Uint8Array(await buildJobZip(job)).buffer,
                `content-forge-${job.id}.zip`,
                "application/zip",
              );
            } catch {
              setError("ZIP export failed. Download artefacts individually.");
            }
          }}
        >
          Download all as ZIP
        </button>
      </div>
      <div
        role="tablist"
        aria-label="Output previews"
        className="flex flex-wrap gap-2"
      >
        {job.artefacts.map((a) => (
          <button
            role="tab"
            aria-selected={artefact?.type === a.type}
            aria-controls={`preview-${job.id}`}
            key={a.type}
            onClick={() => setSelected(a.type)}
            className={`rounded border border-current/20 px-3 py-2 text-sm ${artefact?.type === a.type ? "bg-current/10" : ""}`}
          >
            {outputOptions.find((o) => o.id === a.type)?.label}
          </button>
        ))}
      </div>
      {job.warnings.map((w) => (
        <p key={w} className="text-xs text-amber-600">
          {w}
        </p>
      ))}
      {job.failedOutputs.length > 0 && (
        <p role="alert" className="text-sm">
          Failed outputs: {job.failedOutputs.join(", ")}. Available artefacts
          are preserved.
        </p>
      )}
      {artefact && (
        <div role="tabpanel" id={`preview-${job.id}`}>
          <ArtefactPreview
            key={artefact.type}
            artefact={artefact}
            onRefine={onUpdate ? refine : undefined}
          />
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

export function TransformDashboard() {
  const [prepared, setPrepared] = useState<PreparedSource | null>(null);
  const [controls, setControls] = useState<OperatorControls>(defaultControls);
  const [selectedOutputs, setSelectedOutputs] = useState<OutputType[]>([
    "executive_summary",
  ]);
  const [overrides, setOverrides] = useState<
    Partial<Record<OutputType, Partial<OperatorControls>>>
  >({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState<TransformationJob | null>(null);
  const [partial, setPartial] = useState<Artefact[]>([]);
  const [failed, setFailed] = useState<OutputType[]>([]);
  async function generate() {
    if (!prepared) return;
    setBusy(true);
    setError("");
    setJob(null);
    setPartial([]);
    setFailed([]);
    try {
      const response = await fetch("/api/transform", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify({
          source: prepared.source,
          documents: prepared.documents,
          controls,
          outputTypes: selectedOutputs,
          overrides,
        }),
      });
      if (!response.ok) {
        const value = await response.json();
        throw new Error(value.error ?? "Generation failed.");
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream.");
      const decoder = new TextDecoder();
      let buffer = "";
      let complete = false;
      const handle = (event: TransformEvent) => {
        if (event.event === "artefact")
          setPartial((old) => [...old, event.artefact]);
        if (event.event === "failed")
          setFailed((old) => [...old, event.outputType]);
        if (event.event === "error") throw new Error(event.error);
        if (event.event === "complete") {
          complete = true;
          setJob(event.job);
          try {
            saveBrowserJob(event.job);
          } catch {
            setError(
              event.mode === "database"
                ? "Saved to database; browser cache is full."
                : "Browser storage is full. Download the ZIP to preserve this job.",
            );
          }
        }
      };
      try {
        while (true) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          let newline;
          while ((newline = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, newline);
            buffer = buffer.slice(newline + 1);
            if (line.trim()) handle(JSON.parse(line));
          }
          if (done) break;
        }
      } finally {
        reader.releaseLock();
      }
      if (!complete)
        throw new Error(
          "Connection ended before completion. Available previews are preserved.",
        );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }
  const hasSource =
    prepared &&
    Boolean(
      prepared.source.text?.trim() ||
      prepared.source.documents?.some(Boolean) ||
      prepared.source.images?.length ||
      prepared.source.video ||
      prepared.source.linkText,
    );
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">New Transformation</h1>
        <p className="mt-2 max-w-3xl text-sm opacity-70">
          Prepare your source, choose the audience and format, then review every
          deliverable before use.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-current/15 p-4">
          <IngestDropzone
            onReady={setPrepared}
            onChange={() => setPrepared(null)}
            disabled={busy}
          />
        </div>
        <fieldset
          disabled={busy}
          className="space-y-5 rounded-lg border border-current/15 p-4"
        >
          <ControlsPanel controls={controls} setControls={setControls} />
          <OutputSelector
            selected={selectedOutputs}
            setSelected={setSelectedOutputs}
          />
          <details>
            <summary className="cursor-pointer text-sm">
              Per-output overrides
            </summary>
            {selectedOutputs.map((type) => (
              <div key={type} className="mt-3 border-t border-current/10 pt-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(overrides[type])}
                    onChange={(e) =>
                      setOverrides((old) => {
                        const next = { ...old };
                        if (e.target.checked) next[type] = { ...controls };
                        else delete next[type];
                        return next;
                      })
                    }
                  />
                  Customize {outputOptions.find((o) => o.id === type)?.label}
                </label>
                {overrides[type] && (
                  <ControlsPanel
                    controls={{ ...controls, ...overrides[type] }}
                    setControls={(value) =>
                      setOverrides({ ...overrides, [type]: value })
                    }
                  />
                )}
              </div>
            ))}
          </details>
          <p className="text-xs opacity-60">
            Estimated generation budget:{" "}
            {selectedOutputs.length *
              { brief: 5000, standard: 8000, detailed: 12000 }[
                controls.detailLevel
              ]}{" "}
            output tokens plus source analysis. Shorter detail uses less.
          </p>
          <button
            disabled={busy || !hasSource || !selectedOutputs.length}
            onClick={generate}
            className="h-11 w-full rounded bg-[#111] text-white disabled:opacity-40 dark:bg-[#f6f3ed] dark:text-[#111]"
          >
            {busy
              ? "Generating…"
              : `Generate ${selectedOutputs.length} output(s)`}
          </button>
        </fieldset>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded border border-red-500/30 p-3 text-sm"
        >
          {error}
        </p>
      )}
      {busy && (
        <div aria-live="polite" className="flex flex-wrap gap-3 text-sm">
          {selectedOutputs.map((type) => (
            <span key={type}>
              {outputOptions.find((o) => o.id === type)?.label}:{" "}
              {partial.some((a) => a.type === type)
                ? "Ready"
                : failed.includes(type)
                  ? "Failed"
                  : "Generating…"}
            </span>
          ))}
        </div>
      )}
      {job ? (
        <JobPreview job={job} onUpdate={setJob} />
      ) : (
        partial.map((artefact) => (
          <ArtefactPreview key={artefact.type} artefact={artefact} />
        ))
      )}
    </div>
  );
}
