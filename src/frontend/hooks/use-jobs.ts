"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  jobsChangedEvent,
  readBrowserJobs,
  saveBrowserJob,
  deleteBrowserJob,
} from "@/lib/browser-jobs";
import type { TransformationJob } from "@/lib/job-types";
import { applyReview, type ArtefactReview } from "@/lib/product";
export type WorkspaceJob = TransformationJob & { remote?: boolean };
export function useJobs() {
  const router = useRouter();
  const [jobs, setJobs] = useState<WorkspaceJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    let version = 0;
    async function load() {
      const current = ++version;
      const local = readBrowserJobs();
      setJobs(local);
      try {
        const response = await fetch("/api/jobs");
        if (response.status === 401) {
          router.replace("/login");
          router.refresh();
          return;
        }
        if (!response.ok) throw new Error();
        const data = await response.json();
        const remote = await Promise.allSettled(
          (data.jobs as Array<{ id: string }>).map(async ({ id }) => {
            const res = await fetch(`/api/jobs/${id}`);
            if (!res.ok) throw new Error();
            return { ...(await res.json()).job, remote: true } as WorkspaceJob;
          }),
        );
        if (cancelled || current !== version) return;
        const complete = remote.flatMap((r) =>
          r.status === "fulfilled" ? [r.value] : [],
        );
        setJobs(
          [
            ...complete,
            ...local.filter((j) => !complete.some((r) => r.id === j.id)),
          ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
        setError(
          remote.some((r) => r.status === "rejected")
            ? "Some stored jobs could not be loaded. Available jobs are shown."
            : "",
        );
      } catch {
        if (!cancelled && current === version)
          setError(
            "Database history is unavailable. Browser jobs remain available.",
          );
      } finally {
        if (!cancelled && current === version) setLoading(false);
      }
    }
    void load();
    window.addEventListener(jobsChangedEvent, load);
    window.addEventListener("storage", load);
    return () => {
      cancelled = true;
      window.removeEventListener(jobsChangedEvent, load);
      window.removeEventListener("storage", load);
    };
  }, [router]);
  const update = useCallback((job: WorkspaceJob) => {
    setJobs((old) => old.map((j) => (j.id === job.id ? job : j)));
    try {
      saveBrowserJob(job);
    } catch {
      setError(
        "Browser storage is full. Download the job to preserve your work.",
      );
    }
  }, []);
  async function review(
    job: WorkspaceJob,
    type: TransformationJob["artefacts"][number]["type"],
    decision: ArtefactReview,
  ) {
    let savedDecision = decision;
    if (job.remote) {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputType: type, review: decision }),
      });
      if (!res.ok) throw new Error("Review could not be saved.");
      savedDecision = (await res.json()).review;
    }
    const next = applyReview(job, type, savedDecision);
    // Local-only review must persist before claiming success.
    if (!job.remote) saveBrowserJob(next);
    else {
      try {
        saveBrowserJob(next);
      } catch {
        setError("Review saved to database; browser cache is full.");
      }
    }
    setJobs((old) =>
      old.map((j) => (j.id === job.id ? { ...next, remote: job.remote } : j)),
    );
  }
  async function remove(job: WorkspaceJob) {
    if (job.remote) {
      const res = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Job could not be deleted.");
    }
    deleteBrowserJob(job.id);
    setJobs((old) => old.filter((j) => j.id !== job.id));
  }
  return { jobs, loading, error, update, review, remove };
}
