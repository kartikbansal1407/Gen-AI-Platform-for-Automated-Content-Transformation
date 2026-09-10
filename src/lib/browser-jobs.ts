import type { TransformationJob } from "./job-types";
export const jobsChangedEvent = "contentforge:jobs-changed";
export const jobStorageKey = "contentforge-jobs-v1";
export function readBrowserJobs(): TransformationJob[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(jobStorageKey) ?? "[]");
    return Array.isArray(value)
      ? value.filter(
          (j) => j && typeof j.id === "string" && Array.isArray(j.artefacts),
        )
      : [];
  } catch {
    return [];
  }
}
export function saveBrowserJob(job: TransformationJob) {
  localStorage.setItem(
    jobStorageKey,
    JSON.stringify(
      [job, ...readBrowserJobs().filter((j) => j.id !== job.id)].slice(0, 20),
    ),
  );
  window.dispatchEvent(new Event(jobsChangedEvent));
}
export function deleteBrowserJob(id: string) {
  localStorage.setItem(
    jobStorageKey,
    JSON.stringify(readBrowserJobs().filter((j) => j.id !== id)),
  );
  window.dispatchEvent(new Event(jobsChangedEvent));
}
