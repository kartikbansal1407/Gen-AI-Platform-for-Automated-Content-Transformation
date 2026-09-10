"use client";
import { useEffect, useState } from "react";
import {
  readBrowserJobs,
  deleteBrowserJob,
  saveBrowserJob,
} from "@/lib/browser-jobs";
import type { TransformationJob } from "@/lib/job-types";
import { JobPreview } from "./transform-dashboard";
type Entry = Pick<
  TransformationJob,
  "id" | "sourceSummary" | "status" | "createdAt"
> & { remote?: boolean };
export function JobHistory() {
  const [jobs, setJobs] = useState<Entry[]>([]);
  const [active, setActive] = useState<TransformationJob | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const local = readBrowserJobs();
      if (!cancelled) setJobs(local);
      try {
        const res = await fetch("/api/jobs");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const remote = (data.jobs ?? []).map((j: Entry) => ({
          ...j,
          remote: true,
        }));
        if (!cancelled)
          setJobs([
            ...remote,
            ...local.filter((j) => !remote.some((r: Entry) => r.id === j.id)),
          ]);
      } catch {
        if (!cancelled)
          setError("Database history unavailable; showing browser jobs.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);
  async function open(entry: Entry) {
    try {
      if (entry.remote) {
        const res = await fetch(`/api/jobs/${entry.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error();
        setActive(data.job);
      } else
        setActive(readBrowserJobs().find((j) => j.id === entry.id) ?? null);
    } catch {
      setError("Could not open job.");
    }
  }
  async function remove(entry: Entry) {
    try {
      if (entry.remote) {
        const res = await fetch(`/api/jobs/${entry.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
      }
      deleteBrowserJob(entry.id);
      setJobs(jobs.filter((j) => j.id !== entry.id));
      if (active?.id === entry.id) setActive(null);
    } catch {
      setError("Could not delete job.");
    }
  }
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">History / Jobs</h1>
      <p className="text-sm opacity-70">
        Inspect sources, review artefacts, refine content, or delete saved jobs.
      </p>
      {error && <p role="alert">{error}</p>}
      {!jobs.length && <p>No transformations saved yet.</p>}
      <div className="space-y-2">
        {jobs.map((j) => (
          <div
            key={j.id}
            className="flex items-center gap-3 rounded border border-current/15 p-3"
          >
            <button
              onClick={() => open(j)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-sm">
                {j.sourceSummary || "Media source"}
              </p>
              <p className="text-xs opacity-60">
                {new Date(j.createdAt).toLocaleString()} · {j.status} ·{" "}
                {j.remote ? "Database" : "Browser"}
              </p>
            </button>
            <button onClick={() => remove(j)} className="text-xs">
              Delete
            </button>
          </div>
        ))}
      </div>
      {active && (
        <>
          <details className="text-sm">
            <summary>Inspect source and controls</summary>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">
              {JSON.stringify(
                {
                  source: active.source,
                  controls: active.controls,
                  overrides: active.overrides,
                },
                null,
                2,
              )}
            </pre>
          </details>
          <JobPreview
            key={active.id}
            job={active}
            onUpdate={(next) => {
              setActive(next);
              try {
                saveBrowserJob(next);
              } catch {
                setError("Browser cache full; download the job.");
              }
            }}
          />
        </>
      )}
    </div>
  );
}
