"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Plus, FileText, Search } from "lucide-react";
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
const card =
  "rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#14212b]";
const button =
  "inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800";
const name = (type: string) =>
  outputOptions.find((o) => o.id === type)?.label ?? type;
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${card} py-12 text-center`}>
      <FileText aria-hidden className="mx-auto mb-3 size-8 text-slate-300" />
      <p className="mb-5 text-sm text-slate-500 dark:text-slate-300">
        {children}
      </p>
      <Link href="/transform" className={button}>
        <Plus className="size-4" />
        New Transformation
      </Link>
    </div>
  );
}
function Metrics({
  items,
}: {
  items: Array<{ label: string; value: number | string }>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className={card}>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            {item.label}
          </p>
          <p className="mt-3 text-3xl font-semibold tabular-nums">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
export function DashboardView({ jobs }: { jobs: WorkspaceJob[] }) {
  const m = jobMetrics(jobs);
  return (
    <>
      <div
        className={`${card} flex flex-wrap items-center justify-between gap-5`}
      >
        <div>
          <h2 className="text-xl font-semibold">Start with your source.</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Create a briefing, advisory, presentation or other deliverable.
          </p>
        </div>
        <Link
          href="/transform"
          className="inline-flex items-center gap-2 rounded-lg bg-[#172c3b] px-4 py-3 text-sm font-medium text-white"
        >
          <Plus className="size-4" />
          New Transformation
        </Link>
      </div>
      <Metrics
        items={[
          { label: "Transformations", value: m.jobs },
          { label: "Generated artefacts", value: m.artefacts },
          { label: "Awaiting review", value: m.pending },
          { label: "Approved artefacts", value: m.approved },
        ]}
      />
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className={card}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold">Recent transformations</h2>
            <Link href="/history" className="text-xs underline">
              View history
            </Link>
          </div>
          {jobs.length ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {jobs.slice(0, 5).map((job) => (
                <Link
                  href={`/workspace?job=${job.id}`}
                  key={job.id}
                  className="flex items-center gap-3 py-4"
                >
                  <FileText className="size-5 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {job.sourceSummary || "Media transformation"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {job.artefacts.length} artefacts · {job.status}
                    </p>
                  </div>
                  <ArrowUpRight className="size-4" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-8 text-sm text-slate-500">
              Your first transformation will appear here.
            </p>
          )}
        </section>
        <section className={card}>
          <h2 className="font-semibold">Review progress</h2>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">
            Check source evidence and decide which deliverables are ready for
            use.
          </p>
          <dl className="my-6 space-y-4 text-sm">
            <div className="flex justify-between">
              <dt>Pending review</dt>
              <dd>{m.pending}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Changes requested</dt>
              <dd>{m.changesRequested}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Approved</dt>
              <dd>{m.approved}</dd>
            </div>
          </dl>
          <Link href="/review" className={button}>
            Open Review Queue
            <ArrowUpRight className="size-4" />
          </Link>
        </section>
      </div>
    </>
  );
}
export function DocumentsView({ jobs }: { jobs: WorkspaceJob[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const docs = sourceDocuments(jobs);
  const shown = docs.filter((d) =>
    `${d.name} ${d.text}`.toLowerCase().includes(query.toLowerCase()),
  );
  const active = docs.find((d) => d.id === selected);
  return (
    <>
      <div className="flex flex-wrap justify-between gap-3">
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-[#14212b]">
          <Search className="size-4 text-slate-400" />
          <input
            aria-label="Search documents"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sources"
            className="h-10 bg-transparent text-sm outline-none"
          />
        </label>
        <Link href="/transform" className={button}>
          Upload a source
        </Link>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-300">
        Sources from your saved transformations. Uploads become part of this
        library when generation completes.
      </p>
      {!docs.length ? (
        <Empty>No source documents yet.</Empty>
      ) : (
        <div className={`${card} overflow-auto`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-400">
              <tr>
                <th className="pb-3">Source</th>
                <th>Type</th>
                <th>Words</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-slate-100 dark:border-slate-700"
                >
                  <td className="max-w-xs py-4">
                    <button
                      className="max-w-full truncate font-medium text-left"
                      onClick={() => setSelected(d.id)}
                    >
                      {d.name}
                    </button>
                  </td>
                  <td>{d.kind}</td>
                  <td>{d.words || "—"}</td>
                  <td>{new Date(d.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && (
            <p className="py-6 text-sm">No matching sources.</p>
          )}
        </div>
      )}
      {active && (
        <section className={card}>
          <h2 className="font-semibold">{active.name}</h2>
          <pre className="my-4 max-h-80 overflow-auto whitespace-pre-wrap font-sans text-sm leading-6">
            {active.text}
          </pre>
          <Link href={`/workspace?job=${active.jobId}`} className={button}>
            Open transformation
          </Link>
        </section>
      )}
    </>
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
  const active = jobs.find((j) => j.id === (selected ?? params.get("job")));
  const shown = jobs.filter(
    (j) =>
      (history || j.artefacts.length) &&
      `${j.sourceSummary} ${j.artefacts.map((a) => a.title).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <label className="block text-sm">
        Search transformations
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="ml-3 rounded-lg border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-600"
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {!jobs.length ? (
        <Empty>
          {history
            ? "No transformation history yet."
            : "Generate your first set of deliverables to open a workspace."}
        </Empty>
      ) : (
        <div className="space-y-2">
          {shown.map((job) => (
            <div className={`${card} flex items-center gap-4`} key={job.id}>
              <button
                onClick={() => setSelected(job.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-medium">
                  {job.sourceSummary || "Media transformation"}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {new Date(job.createdAt).toLocaleString()} ·{" "}
                  {job.artefacts.length} artefacts · {job.status}
                </p>
              </button>
              {history ? (
                <button
                  className="text-xs text-slate-500"
                  onClick={async () => {
                    try {
                      await onRemove(job);
                      if (selected === job.id) setSelected("");
                    } catch {
                      setError("Could not delete this transformation.");
                    }
                  }}
                >
                  Delete
                </button>
              ) : (
                <Link
                  href={`/review?job=${job.id}`}
                  className="text-xs underline"
                >
                  Review
                </Link>
              )}
            </div>
          ))}
          {!shown.length && <p>No matching transformations.</p>}
        </div>
      )}
      {active && (
        <section className="space-y-4">
          <details className={card}>
            <summary className="text-sm font-medium">
              Source and configuration
            </summary>
            <p className="my-4 text-sm leading-6">{active.sourceSummary}</p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {Object.entries({
                Audience: active.controls.audience,
                Tone: active.controls.tone,
                Language: active.controls.language,
                "Detail level": active.controls.detailLevel,
                Objective: active.controls.objective,
                Style: active.controls.style,
              }).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-1">{value}</dd>
                </div>
              ))}
            </dl>
            {Object.entries(active.overrides).map(([type, overrides]) => (
              <p key={type} className="mt-3 text-sm">
                {name(type)} overrides:{" "}
                {Object.entries(overrides)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(" · ")}
              </p>
            ))}
            <ul className="mt-4 space-y-2 text-sm">
              {active.documents.map((doc, index) => (
                <li key={index}>
                  {doc.filename} · {doc.wordCount} words
                </li>
              ))}
            </ul>
            <Link
              href="/documents"
              className="mt-4 inline-block text-sm underline"
            >
              Inspect source documents
            </Link>
          </details>
          <JobPreview
            key={active.id}
            job={active}
            onUpdate={(job) => onUpdate({ ...job, remote: active.remote })}
          />
        </section>
      )}
    </>
  );
}
export function ReviewQueueView({
  jobs,
  onReview,
}: {
  jobs: WorkspaceJob[];
  onReview: (
    job: WorkspaceJob,
    type: Artefact["type"],
    decision: ArtefactReview,
  ) => Promise<void>;
}) {
  const params = useSearchParams();
  const jobId = params.get("job");
  const [filter, setFilter] = useState<ReviewStatus | "all">("pending");
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const rows = jobs.flatMap((job) =>
    job.artefacts.map((artefact) => ({
      job,
      artefact,
      id: `${job.id}:${artefact.type}`,
    })),
  );
  const visible = rows.filter(
    (row) =>
      (!jobId || row.job.id === jobId) &&
      (filter === "all" || reviewStatus(row.artefact) === filter),
  );
  const active = rows.find((r) => r.id === selected);
  async function decide(status: ReviewStatus) {
    if (!active) return;
    setBusy(true);
    setError("");
    try {
      await onReview(active.job, active.artefact.type, {
        status,
        note,
        updatedAt: new Date().toISOString(),
      });
      setSelected("");
      setNote("");
    } catch {
      setError(
        "Review could not be saved. Your decision has not been applied.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="text-sm">
          Review status
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="ml-3 rounded-lg border border-slate-200 bg-transparent p-2 dark:border-slate-600"
          >
            <option value="pending">Pending review</option>
            <option value="changes_requested">Changes requested</option>
            <option value="approved">Approved</option>
            <option value="all">All artefacts</option>
          </select>
        </label>
        <p className="text-xs text-slate-400">
          Approval records readiness; it does not publish content.
        </p>
      </div>
      {error && <p role="alert">{error}</p>}
      {jobId && (
        <Link href="/review" className="text-sm underline">
          Show all transformations
        </Link>
      )}
      {!rows.length ? (
        <Empty>No artefacts are waiting for review.</Empty>
      ) : !visible.length ? (
        <p className={card}>No artefacts in this review state.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((row) => (
            <button
              key={row.id}
              className={`${card} text-left`}
              onClick={() => {
                setSelected(row.id);
                setNote(row.artefact.review?.note ?? "");
              }}
            >
              <p className="mb-2 text-xs text-slate-400">
                {name(row.artefact.type)} ·{" "}
                {reviewStatus(row.artefact).replaceAll("_", " ")}
              </p>
              <h2 className="truncate text-sm font-semibold">
                {row.artefact.title}
              </h2>
              <p className="mt-3 text-xs text-slate-500">
                {row.artefact.warnings.length} review warnings ·{" "}
                {row.artefact.confidence}% confidence
              </p>
            </button>
          ))}
        </div>
      )}
      {active && (
        <div className="space-y-4">
          <ArtefactPreview artefact={active.artefact} />
          <fieldset disabled={busy} className={card}>
            <label className="block text-sm">
              Review note
              <textarea
                value={note}
                maxLength={2000}
                onChange={(e) => setNote(e.target.value)}
                className="mt-2 min-h-20 w-full rounded-lg border border-slate-200 bg-transparent p-3 dark:border-slate-600"
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={() => decide("approved")} className={button}>
                Approve artefact
              </button>
              <button
                onClick={() => decide("changes_requested")}
                className={button}
              >
                Request changes
              </button>
              <button onClick={() => decide("pending")} className={button}>
                Return to pending
              </button>
              <Link href={`/workspace?job=${active.job.id}`} className={button}>
                Open in Workspace
              </Link>
            </div>
          </fieldset>
        </div>
      )}
    </>
  );
}
export function AnalyticsView({ jobs }: { jobs: WorkspaceJob[] }) {
  const m = jobMetrics(jobs);
  return (
    <>
      <p className="text-xs text-slate-500 dark:text-slate-300">
        Based on {m.jobs} loaded transformations. These are workspace activity
        counts, not lifetime totals.
      </p>
      <Metrics
        items={[
          { label: "Completed jobs", value: m.done },
          { label: "Partial jobs", value: m.partial },
          { label: "Failed jobs", value: m.failed },
          { label: "Approved artefacts", value: m.approved },
        ]}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className={card}>
          <h2 className="mb-5 font-semibold">Generated output formats</h2>
          {Object.entries(m.outputCounts).length ? (
            Object.entries(m.outputCounts).map(([type, count]) => (
              <div key={type} className="mb-4">
                <div className="mb-2 flex justify-between text-sm">
                  <span>{name(type)}</span>
                  <span>{count}</span>
                </div>
                <div className="h-2 rounded bg-slate-100 dark:bg-slate-700">
                  <div
                    className="h-2 rounded bg-slate-500"
                    style={{
                      width: `${(count / Math.max(1, m.artefacts)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              Output activity appears after your first transformation.
            </p>
          )}
        </section>
        <section className={card}>
          <h2 className="mb-5 font-semibold">Transformation activity</h2>
          {Object.entries(m.dailyCounts)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([day, count]) => (
              <div
                key={day}
                className="flex justify-between border-b border-slate-100 py-3 text-sm dark:border-slate-700"
              >
                <span>{day}</span>
                <span>{count} jobs</span>
              </div>
            ))}
          {!jobs.length && (
            <p className="text-sm text-slate-500">No activity recorded yet.</p>
          )}
          <p className="mt-6 text-xs text-slate-500">
            {m.pending} pending review · {m.changesRequested} need changes ·{" "}
            {m.warnings} artefacts carry warnings
          </p>
        </section>
      </div>
    </>
  );
}
export function SettingsView({
  jobs,
  theme,
  setTheme,
}: {
  jobs: TransformationJob[];
  theme: string;
  setTheme: (theme: string) => void;
}) {
  const [message, setMessage] = useState("");
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className={card}>
        <h2 className="font-semibold">Appearance</h2>
        <label className="mt-5 block text-sm">
          Theme
          <select
            aria-label="Theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="ml-3 rounded border border-slate-200 bg-transparent p-2 dark:border-slate-600"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </section>
      <section className={card}>
        <h2 className="font-semibold">Workspace data</h2>
        <p className="my-4 text-sm leading-6 text-slate-500 dark:text-slate-300">
          Export the loaded jobs, sources, review decisions and artefacts.
          Delete individual transformations from History.
        </p>
        <button
          className={button}
          onClick={() => {
            try {
              downloadFile(
                JSON.stringify(jobs, null, 2),
                "content-forge-workspace.json",
                "application/json",
              );
              setMessage("Workspace export downloaded.");
            } catch {
              setMessage("Export failed. Try again.");
            }
          }}
        >
          Export workspace
        </button>
        {message && (
          <p role="status" className="mt-3 text-sm">
            {message}
          </p>
        )}
      </section>
      <section className={card}>
        <h2 className="font-semibold">Generation and review</h2>
        <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-300">
          Generation settings belong to each transformation. Every new or
          refined artefact starts pending review. Approval is an operator
          decision; source warnings remain visible.
        </p>
      </section>
      <section className={card}>
        <h2 className="font-semibold">Session</h2>
        <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-300">
          This workspace uses an operator access code. Use Sign out in the
          sidebar to end your session. Local browser data remains on this device
          until deleted from History.
        </p>
      </section>
    </div>
  );
}
