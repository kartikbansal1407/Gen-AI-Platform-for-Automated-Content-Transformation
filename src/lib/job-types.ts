import type {
  OperatorControls,
  OutputType,
  SourceContent,
} from "@/agent/transform-types";
import type { ParsedDocument } from "@/agent/ingest/parse";
export type Artefact = {
  review?: import("./product").ArtefactReview;
  type: OutputType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  warnings: string[];
  confidence: number;
  mode?: string;
  sourceAttribution?: string;
  claimSupport?: Array<{
    claim: string;
    supported: boolean;
    sourceEvidence: string;
    flagIfWeak: boolean;
  }>;
};
export type TransformResult = {
  sourceSummary: string;
  artefacts: Artefact[];
  warnings: string[];
  failedOutputs: OutputType[];
  status: "done" | "partial" | "failed";
};
export type TransformationJob = TransformResult & {
  id: string;
  createdAt: string;
  source: SourceContent;
  controls: OperatorControls;
  outputTypes: OutputType[];
  overrides: Partial<Record<OutputType, Partial<OperatorControls>>>;
  documents: ParsedDocument[];
};
export type TransformEvent =
  | { event: "artefact"; artefact: Artefact }
  | { event: "failed"; outputType: OutputType; error: string }
  | { event: "complete"; job: TransformationJob; mode: "database" | "browser" }
  | { event: "error"; error: string };
