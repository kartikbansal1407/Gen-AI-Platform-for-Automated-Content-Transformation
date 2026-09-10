import type { Artefact, TransformationJob } from "./job-types";
import { z } from "zod";

export const productSections = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "An overview of your content operations.",
  },
  {
    id: "transform",
    label: "New Transformation",
    description: "Turn source information into communication artefacts.",
  },
  {
    id: "documents",
    label: "Documents",
    description: "Inspect and reuse the sources behind your transformations.",
  },
  {
    id: "workspace",
    label: "Workspace",
    description: "Develop and refine your generated deliverables.",
  },
  {
    id: "review",
    label: "Review Queue",
    description:
      "Review evidence and decide which artefacts are ready for use.",
  },
  {
    id: "history",
    label: "History",
    description: "Revisit completed transformations and their source material.",
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Transformation volume, completion and review progress.",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Manage this workspace and its data.",
  },
] as const;
export type ProductSection = (typeof productSections)[number]["id"];
export type ReviewStatus = "pending" | "approved" | "changes_requested";
export const reviewSchema = z.object({
  status: z.enum(["pending", "approved", "changes_requested"]),
  note: z.string().trim().max(2000).default(""),
});
export type ArtefactReview = z.infer<typeof reviewSchema> & {
  updatedAt: string;
};
export function reviewStatus(artefact: Artefact): ReviewStatus {
  return artefact.review?.status ?? "pending";
}
export function applyReview(
  job: TransformationJob,
  type: Artefact["type"],
  review: ArtefactReview,
): TransformationJob {
  if (!job.artefacts.some((a) => a.type === type))
    throw new Error("Artefact not found.");
  return {
    ...job,
    artefacts: job.artefacts.map((a) =>
      a.type === type ? { ...a, review } : a,
    ),
  };
}
export function jobMetrics(jobs: TransformationJob[]) {
  const artefacts = jobs.flatMap((j) => j.artefacts);
  const outputCounts: Record<string, number> = {};
  const dailyCounts: Record<string, number> = {};
  for (const job of jobs) {
    const day = job.createdAt.slice(0, 10);
    dailyCounts[day] = (dailyCounts[day] ?? 0) + 1;
  }
  for (const artefact of artefacts)
    outputCounts[artefact.type] = (outputCounts[artefact.type] ?? 0) + 1;
  return {
    jobs: jobs.length,
    artefacts: artefacts.length,
    done: jobs.filter((j) => j.status === "done").length,
    partial: jobs.filter((j) => j.status === "partial").length,
    failed: jobs.filter((j) => j.status === "failed").length,
    pending: artefacts.filter((a) => reviewStatus(a) === "pending").length,
    approved: artefacts.filter((a) => reviewStatus(a) === "approved").length,
    changesRequested: artefacts.filter(
      (a) => reviewStatus(a) === "changes_requested",
    ).length,
    warnings: artefacts.filter((a) => a.warnings.length > 0).length,
    outputCounts,
    dailyCounts,
  };
}
export function sourceDocuments(jobs: TransformationJob[]) {
  return jobs.flatMap((job) => [
    ...job.documents.map((doc, index) => ({
      id: `${job.id}:document:${index}`,
      jobId: job.id,
      name: doc.filename,
      kind: "Document",
      text: doc.text,
      words: doc.wordCount,
      createdAt: job.createdAt,
    })),
    ...(job.source.text?.trim()
      ? [
          {
            id: `${job.id}:text`,
            jobId: job.id,
            name: "Source text / context",
            kind: "Text",
            text: job.source.text,
            words: job.source.text.trim().split(/\s+/).length,
            createdAt: job.createdAt,
          },
        ]
      : []),
    ...(job.source.linkUrl
      ? [
          {
            id: `${job.id}:url`,
            jobId: job.id,
            name: job.source.linkUrl,
            kind: "URL",
            text: job.source.linkText ?? "No text extracted.",
            words: (job.source.linkText ?? "").split(/\s+/).filter(Boolean)
              .length,
            createdAt: job.createdAt,
          },
        ]
      : []),
    ...(job.source.images ?? []).map((img, index) => ({
      id: `${job.id}:image:${index}`,
      jobId: job.id,
      name: img.altText ?? `Image ${index + 1}`,
      kind: "Image",
      text: img.altText ?? "Image retained in the job source.",
      words: 0,
      createdAt: job.createdAt,
    })),
    ...(job.source.video
      ? [
          {
            id: `${job.id}:video`,
            jobId: job.id,
            name: "Source video",
            kind: "Video",
            text: "Video retained in the job source; no autoplay.",
            words: 0,
            createdAt: job.createdAt,
          },
        ]
      : []),
  ]);
}
