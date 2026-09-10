"use client";

import { useState } from "react";
import { ArrowDownToLine, Check, LoaderCircle, Sparkles, WandSparkles } from "lucide-react";
import { IngestDropzone, type PreparedSource } from "./ingest-dropzone";
import { ControlsPanel, defaultControls } from "./controls-panel";
import { OutputSelector, outputOptions } from "./output-selector";
import { ArtefactPreview } from "./artefact-preview";
import type { OperatorControls, OutputType } from "@/agent/transform-types";
import type { Artefact, TransformationJob, TransformEvent } from "@/lib/job-types";
import { buildJobZip, downloadFile } from "@/lib/exports";
import { saveBrowserJob } from "@/lib/browser-jobs";

export function JobPreview({ job, onUpdate }: { job: TransformationJob; onUpdate?: (job: TransformationJob) => void }) {
  const [selected, setSelected] = useState<OutputType>(job.artefacts[0]?.type ?? "executive_summary");
  const [error, setError] = useState("");
  const artefact = job.artefacts.find((item) => item.type === selected) ?? job.artefacts[0];

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
    const next = { ...job, artefacts: job.artefacts.map((item) => item.type === artefact.type ? result.artefact : item) };
    try {
      saveBrowserJob(next);
    } catch {
      setError("Browser storage is full. Download this job to preserve changes.");
    }
    onUpdate?.(next);
  }

  return (
    <section className="space-y-4" aria-label="Generated artefacts">
      <div className="orbita-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Generation complete</p>
          <h2 className="mt-1 text-lg font-semibold">{job.artefacts.length} deliverables ready</h2>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--surface-muted)]"
          onClick={async () => {
            try {
              downloadFile(new Uint8Array(await buildJobZip(job)).buffer, `content-forge-${job.id}.zip`, "application/zip");
            } catch {
              setError("ZIP export failed. Download artefacts individually.");
            }
          }}
        >
          <ArrowDownToLine className="size-4" />Export workspace
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Output previews">
        {job.artefacts.map((item) => {
          const active = artefact?.type === item.type;
          return (
            <button
              role="tab"
              aria-selected={active}
              aria-controls={`preview-${job.id}`}
              key={item.type}
              onClick={() => setSelected(item.type)}
              className={`shrink-0 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${active ? "border-[#173f4f] bg-[#173f4f] text-white dark:border-[#d9ff72] dark:bg-[#d9ff72] dark:text-[#173f4f]" : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}
            >
              {outputOptions.find((option) => option.id === item.type)?.label}
            </button>
          );
        })}
      </div>

      {job.warnings.length > 0 && <div className="rounded-2xl border border-amber-300/70 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">{job.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
      {job.failedOutputs.length > 0 && <p role="alert" className="rounded-2xl border border-red-300/60 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">Failed outputs: {job.failedOutputs.join(", ")}. Available artefacts are preserved.</p>}
      {artefact && <div role="tabpanel" id={`preview-${job.id}`}><ArtefactPreview key={artefact.type} artefact={artefact} onRefine={onUpdate ? refine : undefined} /></div>}
      {error && <p role="alert" className="rounded-xl border border-red-300 p-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}

export function TransformDashboard() {
  const [prepared, setPrepared] = useState<PreparedSource | null>(null);
  const [controls, setControls] = useState<OperatorControls>(defaultControls);
  const [selectedOutputs, setSelectedOutputs] = useState<OutputType[]>(["executive_summary"]);
  const [overrides, setOverrides] = useState<Partial<Record<OutputType, Partial<OperatorControls>>>>({});
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
        headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: JSON.stringify({ source: prepared.source, documents: prepared.documents, controls, outputTypes: selectedOutputs, overrides }),
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
        if (event.event === "artefact") setPartial((old) => [...old, event.artefact]);
        if (event.event === "failed") setFailed((old) => [...old, event.outputType]);
        if (event.event === "error") throw new Error(event.error);
        if (event.event === "complete") {
          complete = true;
          setJob(event.job);
          try {
            saveBrowserJob(event.job);
          } catch {
            setError(event.mode === "database" ? "Saved to database; browser cache is full." : "Browser storage is full. Download the ZIP to preserve this job.");
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
      if (!complete) throw new Error("Connection ended before completion. Available previews are preserved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  const hasSource = prepared && Boolean(prepared.source.text?.trim() || prepared.source.documents?.some(Boolean) || prepared.source.images?.length || prepared.source.video || prepared.source.linkText);
  const estimatedTokens = selectedOutputs.length * { brief: 5000, standard: 8000, detailed: 12000 }[controls.detailLevel];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] bg-[#173f4f] px-5 py-7 text-white sm:px-8 sm:py-9 dark:bg-[#d9ff72] dark:text-[#173f4f]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70"><WandSparkles className="size-4" />New Transformation</div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Turn one source into work you can actually use.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 opacity-75">Bring the source. Set the audience and intent. Orbita creates the deliverables, keeps evidence visible, and leaves the final call with you.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {["01 Source", "02 Configure", "03 Review"].map((step) => <span key={step} className="rounded-xl border border-white/20 px-3 py-2.5 dark:border-[#173f4f]/20">{step}</span>)}
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,.85fr)]">
        <section className="orbita-panel p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Step 1</p><h2 className="mt-1 text-lg font-semibold">Add source material</h2><p className="mt-1 text-sm text-[var(--muted)]">Text, prompt, document, image, video or URL.</p></div>
            {hasSource && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><Check className="size-3.5" />Ready</span>}
          </div>
          <IngestDropzone onReady={setPrepared} onChange={() => setPrepared(null)} disabled={busy} />
        </section>

        <fieldset disabled={busy} className="orbita-panel p-5 sm:p-6">
          <div className="mb-5"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Step 2</p><h2 className="mt-1 text-lg font-semibold">Shape the output</h2><p className="mt-1 text-sm text-[var(--muted)]">Set the communication rules once, then choose what to generate.</p></div>
          <div className="space-y-6">
            <ControlsPanel controls={controls} setControls={setControls} />
            <div className="border-t border-[var(--line)] pt-5"><OutputSelector selected={selectedOutputs} setSelected={setSelectedOutputs} /></div>
            <details className="rounded-2xl border border-[var(--line)] bg-[var(--background)] p-4">
              <summary className="cursor-pointer text-sm font-semibold">Advanced: per-output overrides</summary>
              {selectedOutputs.map((type) => (
                <div key={type} className="mt-4 border-t border-[var(--line)] pt-4">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={Boolean(overrides[type])} onChange={(event) => setOverrides((old) => { const next = { ...old }; if (event.target.checked) next[type] = { ...controls }; else delete next[type]; return next; })} />
                    Customize {outputOptions.find((option) => option.id === type)?.label}
                  </label>
                  {overrides[type] && <div className="mt-4"><ControlsPanel controls={{ ...controls, ...overrides[type] }} setControls={(value) => setOverrides({ ...overrides, [type]: value })} /></div>}
                </div>
              ))}
            </details>
            <div className="flex items-center justify-between gap-3 text-xs text-[var(--muted)]"><span>{selectedOutputs.length} output{selectedOutputs.length === 1 ? "" : "s"} selected</span><span>~{estimatedTokens.toLocaleString()} max output tokens</span></div>
            <button disabled={busy || !hasSource || !selectedOutputs.length} onClick={generate} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173f4f] px-4 text-sm font-semibold text-white transition hover:bg-[#0f303d] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#d9ff72] dark:text-[#173f4f] dark:hover:bg-[#efffb9]">
              {busy ? <><LoaderCircle className="size-4 animate-spin" />Generating deliverables…</> : <><Sparkles className="size-4" />Generate {selectedOutputs.length} output{selectedOutputs.length === 1 ? "" : "s"}</>}
            </button>
          </div>
        </fieldset>
      </div>

      {error && <p role="alert" className="rounded-2xl border border-red-300/70 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">{error}</p>}

      {busy && (
        <section aria-live="polite" className="orbita-panel p-5">
          <div className="mb-4 flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" /><p className="text-sm font-semibold">Orbita is building your workspace</p></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {selectedOutputs.map((type) => {
              const ready = partial.some((item) => item.type === type);
              const hasFailed = failed.includes(type);
              return <div key={type} className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--background)] px-3 py-2.5 text-sm"><span>{outputOptions.find((option) => option.id === type)?.label}</span><span className={`text-xs ${ready ? "text-emerald-600" : hasFailed ? "text-red-600" : "text-[var(--muted)]"}`}>{ready ? "Ready" : hasFailed ? "Failed" : "Working"}</span></div>;
            })}
          </div>
        </section>
      )}

      {job ? <JobPreview job={job} onUpdate={setJob} /> : partial.map((artefact) => <ArtefactPreview key={artefact.type} artefact={artefact} />)}
    </div>
  );
}
