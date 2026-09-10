"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileSearch,
  FileText,
  FolderOpen,
  History,
  Layers3,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  jobMetrics,
  sourceDocuments,
  reviewStatus,
  type ArtefactReview,
  type ReviewStatus,
} from "@/lib/product";
import type { WorkspaceJob } from "../hooks/use-jobs";
import type { TransformationJob, Artefact } from "@/lib/job-types";
import { JobPreview } from "./transform-dashboard";
import { ArtefactPreview } from "./artefact-preview";
import { downloadFile } from "@/lib/exports";
import { outputOptions } from "./output-selector";

const panel = "orbita-panel p-5 sm:p-6";
const button =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--surface-muted)]";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#173f4f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f303d] dark:bg-[#d9ff72] dark:text-[#173f4f] dark:hover:bg-[#efffb9]";
const name = (type: string) =>
  outputOptions.find((option) => option.id === type)?.label ?? type;

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="orbita-panel grid min-h-[250px] place-items-center border-dashed p-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-[var(--surface-muted)] text-[var(--muted)]">
          <FileText className="size-5" />
        </div>
        <p className="text-sm leading-6 text-[var(--muted)]">{children}</p>
        <Link href="/transform" className={`${primaryButton} mt-5`}>
          <Plus className="size-4" />New Transformation
        </Link>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number | string;
  helper?: string;
}) {
  return (
    <div className="orbita-panel p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] tabular-nums">
        {value}
      </p>
      {helper && <p className="mt-2 text-xs text-[var(--muted)]">{helper}</p>}
    </div>
  );
}

function Metrics({
  items,
}: {
  items: Array<{ label: string; value: number | string; helper?: string }>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <MetricCard key={item.label} {...item} />
      ))}
    </div>
  );
}

function statusTone(status: string) {
  if (status === "approved" || status === "done")
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (status === "failed" || status === "changes_requested")
    return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  if (status === "partial")
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  return "bg-[var(--surface-muted)] text-[var(--muted)]";
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone(status)}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function DashboardView({ jobs }: { jobs: WorkspaceJob[] }) {
  const metrics = jobMetrics(jobs);
  const approvalRate = metrics.artefacts
    ? Math.round((metrics.approved / metrics.artefacts) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[26px] border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[var(--muted)]">
              <Sparkles className="size-4" />Operator overview
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
              Start with the source. Leave with something usable.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
              Transform source material, review the evidence, refine what matters, and export only what you are ready to use.
            </p>
          </div>
          <Link href="/transform" className={primaryButton}>
            <Plus className="size-4" />New Transformation
          </Link>
        </div>
      </section>

      <Metrics
        items={[
          { label: "Transformations", value: metrics.jobs, helper: "Loaded workspace jobs" },
          { label: "Deliverables", value: metrics.artefacts, helper: "Across all output formats" },
          { label: "Awaiting review", value: metrics.pending, helper: "Needs an operator decision" },
          { label: "Approval rate", value: `${approvalRate}%`, helper: `${metrics.approved} approved` },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]">
        <section className={panel}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Activity</p>
              <h3 className="mt-1 text-lg font-semibold">Recent transformations</h3>
            </div>
            <Link href="/history" className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)]">
              View history
            </Link>
          </div>

          {jobs.length ? (
            <div className="divide-y divide-[var(--line)]">
              {jobs.slice(0, 6).map((job) => (
                <Link
                  href={`/workspace?job=${job.id}`}
                  key={job.id}
                  className="group flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-muted)] text-[var(--muted)]">
                    <FileText className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{job.sourceSummary || "Media transformation"}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {job.artefacts.length} deliverables · {new Date(job.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusPill status={job.status} />
                  <ArrowUpRight className="hidden size-4 text-[var(--muted)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:block" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-[var(--muted)]">Your first transformation will appear here.</div>
          )}
        </section>

        <section className={`${panel} flex flex-col`}>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Review health</p>
            <h3 className="mt-1 text-lg font-semibold">Human control stays visible.</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Approval changes readiness state only. Nothing is published automatically.</p>
          </div>
          <div className="my-6 space-y-3">
            {[
              ["Pending", metrics.pending],
              ["Changes requested", metrics.changesRequested],
              ["Approved", metrics.approved],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-xl bg-[var(--background)] px-3.5 py-3 text-sm">
                <span className="text-[var(--muted)]">{label}</span>
                <span className="font-semibold tabular-nums">{value}</span>
              </div>
            ))}
          </div>
          <Link href="/review" className={`${button} mt-auto`}>
            Open Review Queue<ArrowRight className="size-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}

export function DocumentsView({ jobs }: { jobs: WorkspaceJob[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const docs = sourceDocuments(jobs);
  const shown = docs.filter((doc) =>
    `${doc.name} ${doc.text}`.toLowerCase().includes(query.toLowerCase()),
  );
  const active = docs.find((doc) => doc.id === selected);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="orbita-input flex h-11 min-w-0 items-center gap-2 px-3 sm:w-[360px]">
          <Search className="size-4 shrink-0 text-[var(--muted)]" />
          <input aria-label="Search documents" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sources" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        <Link href="/transform" className={button}><Plus className="size-4" />Add source</Link>
      </section>

      {!docs.length ? (
        <Empty>No source documents yet.</Empty>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,.8fr)]">
          <section className={`${panel} overflow-hidden p-0`}>
            <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
              <p className="text-xs text-[var(--muted)]">{shown.length} of {docs.length} sources</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-[var(--background)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  <tr><th className="px-5 py-3 sm:px-6">Source</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Words</th><th className="px-4 py-3">Added</th></tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {shown.map((doc) => (
                    <tr key={doc.id} className={`${selected === doc.id ? "bg-[var(--surface-muted)]" : "hover:bg-[var(--background)]"} transition`}>
                      <td className="px-5 py-4 sm:px-6"><button className="max-w-[360px] truncate text-left font-semibold" onClick={() => setSelected(doc.id)}>{doc.name}</button></td>
                      <td className="px-4 py-4 text-[var(--muted)]">{doc.kind}</td>
                      <td className="px-4 py-4 text-[var(--muted)]">{doc.words || "—"}</td>
                      <td className="px-4 py-4 text-[var(--muted)]">{new Date(doc.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!shown.length && <div className="p-8 text-center text-sm text-[var(--muted)]">No matching sources.</div>}
          </section>

          <section className={`${panel} min-h-[320px]`}>
            {active ? (
              <>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Source preview</p><h3 className="mt-1 break-words text-base font-semibold">{active.name}</h3></div>
                  <FileSearch className="size-5 shrink-0 text-[var(--muted)]" />
                </div>
                <pre className="orbita-scrollbar max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl bg-[var(--background)] p-4 font-sans text-sm leading-6 text-[var(--muted)]">{active.text}</pre>
                <Link href={`/workspace?job=${active.jobId}`} className={`${button} mt-4`}>Open transformation<ArrowRight className="size-4" /></Link>
              </>
            ) : (
              <div className="grid min-h-[260px] place-items-center text-center"><div><FolderOpen className="mx-auto mb-3 size-8 text-[var(--muted)]" /><p className="text-sm font-semibold">Select a source to inspect it</p><p className="mt-1 text-xs text-[var(--muted)]">Source previews stay tied to their transformation.</p></div></div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export function WorkspaceView({
  jobs,
  history = false,
  onUpdate,
  onRemove,
}: {
  jobs: WorkspaceJob[];
  history?: boolean;
  onUpdate: (job: WorkspaceJob) => void;
  onRemove: (job: WorkspaceJob) => Promise<void>;
}) {
  const params = useSearchParams();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const active = jobs.find((job) => job.id === (selected ?? params.get("job")));
  const shown = jobs.filter(
    (job) =>
      (history || job.artefacts.length) &&
      `${job.sourceSummary} ${job.artefacts.map((artefact) => artefact.title).join(" ")}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="orbita-input flex h-11 items-center gap-2 px-3 sm:w-[360px]">
          <Search className="size-4 text-[var(--muted)]" />
          <input aria-label="Search transformations" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transformations" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        <p className="text-xs text-[var(--muted)]">{shown.length} transformation{shown.length === 1 ? "" : "s"}</p>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!jobs.length ? (
        <Empty>{history ? "No transformation history yet." : "Generate your first set of deliverables to open a workspace."}</Empty>
      ) : (
        <section className="orbita-panel overflow-hidden p-0">
          <div className="divide-y divide-[var(--line)]">
            {shown.map((job) => (
              <div className="flex items-center gap-4 px-5 py-4 sm:px-6" key={job.id}>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-muted)] text-[var(--muted)]">{history ? <History className="size-4" /> : <Layers3 className="size-4" />}</span>
                <button onClick={() => setSelected(job.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold">{job.sourceSummary || "Media transformation"}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{new Date(job.createdAt).toLocaleString()} · {job.artefacts.length} deliverables</p>
                </button>
                <StatusPill status={job.status} />
                {history ? (
                  <button aria-label="Delete transformation" className="rounded-xl p-2 text-[var(--muted)] transition hover:bg-red-50 hover:text-red-700" onClick={async () => { try { await onRemove(job); if (selected === job.id) setSelected(""); } catch { setError("Could not delete this transformation."); } }}><Trash2 className="size-4" /></button>
                ) : (
                  <Link href={`/review?job=${job.id}`} className="hidden text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)] sm:inline">Review</Link>
                )}
              </div>
            ))}
            {!shown.length && <div className="p-8 text-center text-sm text-[var(--muted)]">No matching transformations.</div>}
          </div>
        </section>
      )}

      {active && (
        <section className="space-y-4">
          <details className={panel}>
            <summary className="cursor-pointer text-sm font-semibold">Source and configuration</summary>
            <p className="my-4 text-sm leading-6 text-[var(--muted)]">{active.sourceSummary}</p>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries({ Audience: active.controls.audience, Tone: active.controls.tone, Language: active.controls.language, "Detail level": active.controls.detailLevel, Objective: active.controls.objective, Style: active.controls.style }).map(([label, value]) => (
                <div key={label} className="rounded-xl bg-[var(--background)] p-3"><dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>
              ))}
            </dl>
            {Object.entries(active.overrides).map(([type, overrides]) => <p key={type} className="mt-3 text-xs text-[var(--muted)]">{name(type)} overrides: {Object.entries(overrides).map(([key, value]) => `${key}: ${value}`).join(" · ")}</p>)}
            {active.documents.length > 0 && <div className="mt-4 rounded-xl border border-[var(--line)] p-3 text-sm">{active.documents.map((doc, index) => <p key={index}>{doc.filename} · {doc.wordCount} words</p>)}</div>}
            <Link href="/documents" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]">Inspect source documents<ArrowUpRight className="size-4" /></Link>
          </details>
          <JobPreview key={active.id} job={active} onUpdate={(job) => onUpdate({ ...job, remote: active.remote })} />
        </section>
      )}
    </div>
  );
}

export function ReviewQueueView({
  jobs,
  onReview,
}: {
  jobs: WorkspaceJob[];
  onReview: (job: WorkspaceJob, type: Artefact["type"], decision: ArtefactReview) => Promise<void>;
}) {
  const params = useSearchParams();
  const jobId = params.get("job");
  const [filter, setFilter] = useState<ReviewStatus | "all">("pending");
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const rows = jobs.flatMap((job) => job.artefacts.map((artefact) => ({ job, artefact, id: `${job.id}:${artefact.type}` })));
  const visible = rows.filter((row) => (!jobId || row.job.id === jobId) && (filter === "all" || reviewStatus(row.artefact) === filter));
  const active = rows.find((row) => row.id === selected);

  async function decide(status: ReviewStatus) {
    if (!active) return;
    setBusy(true);
    setError("");
    try {
      await onReview(active.job, active.artefact.type, { status, note, updatedAt: new Date().toISOString() });
      setSelected("");
      setNote("");
    } catch {
      setError("Review could not be saved. Your decision has not been applied.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="size-4 text-[var(--muted)]" />
          <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="orbita-input h-10 px-3 text-sm outline-none">
            <option value="pending">Pending review</option><option value="changes_requested">Changes requested</option><option value="approved">Approved</option><option value="all">All artefacts</option>
          </select>
        </label>
        <p className="flex items-center gap-2 text-xs text-[var(--muted)]"><ShieldCheck className="size-4" />Approval never publishes automatically.</p>
      </section>

      {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {jobId && <Link href="/review" className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]">Show all transformations</Link>}

      {!rows.length ? (
        <Empty>No artefacts are waiting for review.</Empty>
      ) : !visible.length ? (
        <div className="orbita-panel p-8 text-center text-sm text-[var(--muted)]">No artefacts in this review state.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((row) => {
            const state = reviewStatus(row.artefact);
            return (
              <button key={row.id} className="orbita-panel p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(18,39,48,0.07)]" onClick={() => { setSelected(row.id); setNote(row.artefact.review?.note ?? ""); }}>
                <div className="mb-4 flex items-center justify-between gap-3"><StatusPill status={state} /><span className="text-xs font-semibold text-[var(--muted)]">{row.artefact.confidence}%</span></div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{name(row.artefact.type)}</p>
                <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-5">{row.artefact.title}</h3>
                <div className="mt-5 flex items-center justify-between text-xs text-[var(--muted)]"><span>{row.artefact.warnings.length} warning{row.artefact.warnings.length === 1 ? "" : "s"}</span><ArrowUpRight className="size-4" /></div>
              </button>
            );
          })}
        </div>
      )}

      {active && (
        <div className="space-y-4">
          <ArtefactPreview artefact={active.artefact} />
          <fieldset disabled={busy} className={panel}>
            <div className="mb-4"><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Operator decision</p><h3 className="mt-1 text-lg font-semibold">Review this deliverable</h3></div>
            <label className="block text-sm font-semibold">Review note<textarea value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} placeholder="What should change, or why is this ready?" className="orbita-input mt-2 min-h-24 w-full resize-y p-3 text-sm font-normal outline-none" /></label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => decide("approved")} className={primaryButton}><CheckCircle2 className="size-4" />Approve artefact</button>
              <button onClick={() => decide("changes_requested")} className={button}><TriangleAlert className="size-4" />Request changes</button>
              <button onClick={() => decide("pending")} className={button}><Clock3 className="size-4" />Return to pending</button>
              <Link href={`/workspace?job=${active.job.id}`} className={button}>Open in Workspace</Link>
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
}

export function AnalyticsView({ jobs }: { jobs: WorkspaceJob[] }) {
  const metrics = jobMetrics(jobs);
  const total = Math.max(1, metrics.artefacts);

  return (
    <div className="space-y-5">
      <Metrics items={[{ label: "Completed jobs", value: metrics.done }, { label: "Partial jobs", value: metrics.partial }, { label: "Failed jobs", value: metrics.failed }, { label: "Approved outputs", value: metrics.approved }]} />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className={panel}>
          <div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--surface-muted)]"><BarChart3 className="size-4" /></span><div><h3 className="font-semibold">Generated output formats</h3><p className="text-xs text-[var(--muted)]">Share of loaded deliverables</p></div></div>
          {Object.entries(metrics.outputCounts).length ? Object.entries(metrics.outputCounts).sort(([, a], [, b]) => b - a).map(([type, count]) => (
            <div key={type} className="mb-4 last:mb-0"><div className="mb-2 flex justify-between text-sm"><span>{name(type)}</span><span className="font-semibold tabular-nums">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]"><div className="h-full rounded-full bg-[#173f4f] dark:bg-[#d9ff72]" style={{ width: `${(count / total) * 100}%` }} /></div></div>
          )) : <p className="py-8 text-center text-sm text-[var(--muted)]">Output activity appears after your first transformation.</p>}
        </section>
        <section className={panel}>
          <div className="mb-5"><h3 className="font-semibold">Transformation activity</h3><p className="mt-1 text-xs text-[var(--muted)]">Based on {metrics.jobs} loaded transformations, not lifetime totals.</p></div>
          {Object.entries(metrics.dailyCounts).sort(([a], [b]) => b.localeCompare(a)).map(([day, count]) => <div key={day} className="flex items-center justify-between border-b border-[var(--line)] py-3 text-sm last:border-0"><span className="text-[var(--muted)]">{new Date(`${day}T00:00:00`).toLocaleDateString()}</span><span className="font-semibold">{count} job{count === 1 ? "" : "s"}</span></div>)}
          {!jobs.length && <p className="py-8 text-center text-sm text-[var(--muted)]">No activity recorded yet.</p>}
          <div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-[var(--background)] p-3"><p className="text-lg font-semibold">{metrics.pending}</p><p className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">Pending</p></div><div className="rounded-xl bg-[var(--background)] p-3"><p className="text-lg font-semibold">{metrics.changesRequested}</p><p className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">Changes</p></div><div className="rounded-xl bg-[var(--background)] p-3"><p className="text-lg font-semibold">{metrics.warnings}</p><p className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">Warnings</p></div></div>
        </section>
      </div>
    </div>
  );
}

export function SettingsView({ jobs, theme, setTheme }: { jobs: TransformationJob[]; theme: string; setTheme: (theme: string) => void }) {
  const [message, setMessage] = useState("");

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className={panel}>
        <div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--surface-muted)]"><SlidersHorizontal className="size-4" /></span><div><h3 className="font-semibold">Appearance</h3><p className="text-xs text-[var(--muted)]">Keep the workspace comfortable for long reviews.</p></div></div>
        <label className="block text-sm font-semibold">Theme<select aria-label="Theme" value={theme} onChange={(event) => setTheme(event.target.value)} className="orbita-input mt-2 h-11 w-full px-3 font-normal outline-none"><option value="light">Light</option><option value="dark">Dark</option></select></label>
      </section>

      <section className={panel}>
        <div className="mb-4 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--surface-muted)]"><FolderOpen className="size-4" /></span><div><h3 className="font-semibold">Workspace data</h3><p className="text-xs text-[var(--muted)]">Portable, inspectable, deletable.</p></div></div>
        <p className="mb-4 text-sm leading-6 text-[var(--muted)]">Export loaded jobs, sources, review decisions and artefacts as JSON. Delete individual transformations from History.</p>
        <button className={button} onClick={() => { try { downloadFile(JSON.stringify(jobs, null, 2), "content-forge-workspace.json", "application/json"); setMessage("Workspace export downloaded."); } catch { setMessage("Export failed. Try again."); } }}>Export workspace</button>
        {message && <p role="status" className="mt-3 text-sm text-[var(--muted)]">{message}</p>}
      </section>

      <section className={panel}>
        <div className="mb-4 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--surface-muted)]"><ShieldCheck className="size-4" /></span><h3 className="font-semibold">Generation and review</h3></div>
        <p className="text-sm leading-6 text-[var(--muted)]">Generation settings belong to each transformation. Every new or refined artefact starts pending review. Approval is an operator decision and source warnings remain visible.</p>
      </section>

      <section className={panel}>
        <div className="mb-4 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--surface-muted)]"><Clock3 className="size-4" /></span><h3 className="font-semibold">Session and local data</h3></div>
        <p className="text-sm leading-6 text-[var(--muted)]">This workspace uses an operator access code. Sign out from the sidebar to end the session. Local browser data remains on this device until deleted from History.</p>
      </section>
    </div>
  );
}
