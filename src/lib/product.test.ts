import { expect, it } from "vitest";
import {
  applyReview,
  jobMetrics,
  reviewStatus,
  sourceDocuments,
} from "./product";
import type { TransformationJob } from "./job-types";
import { defaultControls } from "@/frontend/components/controls-panel";
const job: TransformationJob = {
  id: "479a8896-3b79-4b4c-b99b-bb8a01953fbe",
  createdAt: "2026-09-10T08:00:00Z",
  source: {
    text: "Incident report",
    linkUrl: "https://example.org/report",
    linkText: "A public report.",
  },
  sourceSummary: "Incident report",
  controls: defaultControls,
  overrides: {},
  documents: [
    {
      filename: "report.pdf",
      mimeType: "application/pdf",
      size: 100,
      text: "An incident report",
      wordCount: 3,
      warnings: [],
    },
  ],
  status: "partial",
  failedOutputs: ["presentation"],
  outputTypes: ["advisory", "executive_summary", "presentation"],
  warnings: [],
  artefacts: [
    {
      type: "advisory",
      title: "Advisory",
      body: "Source excerpt",
      metadata: {},
      confidence: 60,
      warnings: ["Check source"],
    },
    {
      type: "executive_summary",
      title: "Summary",
      body: "Source excerpt",
      metadata: {},
      confidence: 60,
      warnings: [],
    },
  ],
};
it("treats old and regenerated artefacts as pending and preserves sibling decisions", () => {
  expect(reviewStatus(job.artefacts[0])).toBe("pending");
  const next = applyReview(job, "advisory", {
    status: "approved",
    note: "Evidence checked",
    updatedAt: "2026-09-10T09:00:00Z",
  });
  expect(reviewStatus(next.artefacts[0])).toBe("approved");
  expect(job.artefacts[0].review).toBeUndefined();
  expect(next.artefacts[1]).toBe(job.artefacts[1]);
  expect(() =>
    applyReview(job, "video_package", next.artefacts[0].review!),
  ).toThrow("Artefact not found");
});
it("computes operational counts from actual jobs, including partial failure and reviews", () => {
  const approved = applyReview(job, "advisory", {
    status: "approved",
    note: "",
    updatedAt: job.createdAt,
  });
  expect(jobMetrics([approved])).toMatchObject({
    jobs: 1,
    artefacts: 2,
    done: 0,
    partial: 1,
    failed: 0,
    approved: 1,
    pending: 1,
    warnings: 1,
    outputCounts: { advisory: 1, executive_summary: 1 },
    dailyCounts: { "2026-09-10": 1 },
  });
  expect(jobMetrics([])).toMatchObject({ jobs: 0, approved: 0, pending: 0 });
});
it("retains source metadata and links each library item to its transformation", () => {
  const docs = sourceDocuments([job]);
  expect(docs).toHaveLength(3);
  expect(docs[0]).toMatchObject({
    name: "report.pdf",
    words: 3,
    text: "An incident report",
    jobId: job.id,
  });
  expect(docs[2]).toMatchObject({
    kind: "URL",
    text: "A public report.",
    words: 3,
  });
});
