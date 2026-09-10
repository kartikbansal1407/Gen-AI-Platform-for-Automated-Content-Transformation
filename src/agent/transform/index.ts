import { enrichSourceContent, summarizeSource, transformContent } from "../ai";
import {
  perOutputZodSchemas,
  type OperatorControls,
  type OutputType,
  type SourceContent,
} from "../transform-types";
import { formatOutput, subtitles } from "@/lib/output-format";
import type {
  Artefact,
  TransformEvent,
  TransformResult,
} from "@/lib/job-types";
export type { Artefact, TransformResult } from "@/lib/job-types";
export type OutputTypeForOrchestrator = OutputType;

export function toArtefact(
  type: OutputType,
  response: Awaited<ReturnType<typeof transformContent>>,
): Artefact {
  const data = perOutputZodSchemas[type].parse(response.result) as Record<
    string,
    unknown
  >;
  const warnings = [
    ...(data.warnings as string[]),
    ...(response.videoNarration?.warnings ?? []),
    ...(response.presentationDeck?.warnings ?? []),
  ];
  const metadata = {
    ...data,
    generatedImage: response.generatedImage,
    videoNarration: response.videoNarration,
    presentationDeck: response.presentationDeck,
  };
  if (type === "video_package") {
    const duration = (data.scenes as Array<{ durationSeconds: number }>).reduce(
      (sum, scene) => sum + scene.durationSeconds,
      0,
    );
    Object.assign(metadata, subtitles(String(data.narrationText), duration));
    warnings.push(
      "Subtitle timing is estimated from storyboard duration; synchronize to recorded audio before publication.",
    );
  }
  return {
    type,
    title: String(data.title ?? data.threadTitle ?? type),
    body: formatOutput(type, data),
    metadata,
    warnings,
    confidence: Number(data.confidence ?? 50),
    mode: response.mode,
    sourceAttribution: data.sourceAttribution as string,
    claimSupport: data.claimSupport as Artefact["claimSupport"],
  };
}

export async function transform(
  source: SourceContent,
  controls: OperatorControls,
  requested: OutputType[],
  options?: {
    overrides?: Partial<Record<OutputType, Partial<OperatorControls>>>;
    onEvent?: (event: TransformEvent) => void;
  },
): Promise<TransformResult> {
  if (!requested.length) throw new Error("At least one output type required.");
  const prepared = await enrichSourceContent(source);
  const sourceSummary = await summarizeSource(prepared.enriched);
  const warnings: string[] = [];
  if (source.video && !prepared.videoTranscript)
    warnings.push(
      "Video transcription unavailable or no speech detected; provide a transcript for audio evidence.",
    );
  if (
    prepared.visionDescriptions.some((d) =>
      /demo|unavailable|could not/i.test(d),
    )
  )
    warnings.push(
      "Some images could not be analyzed; verify visual evidence manually.",
    );
  const settled = await Promise.allSettled(
    [...new Set(requested)].map(async (type) => {
      try {
        const effective = { ...controls, ...options?.overrides?.[type] };
        const response = await transformContent({
          source: prepared.enriched,
          controls: effective,
          outputType: type,
          prepared: true,
          sourceSummary,
        });
        const artefact = toArtefact(type, response);
        artefact.warnings.push(...warnings);
        options?.onEvent?.({ event: "artefact", artefact });
        return artefact;
      } catch {
        options?.onEvent?.({
          event: "failed",
          outputType: type,
          error:
            "This output could not be generated. Other outputs remain available.",
        });
        throw type;
      }
    }),
  );
  const artefacts = settled.flatMap((s) =>
    s.status === "fulfilled" ? [s.value] : [],
  );
  const failedOutputs = settled.flatMap((s) =>
    s.status === "rejected" ? [s.reason as OutputType] : [],
  );
  return {
    sourceSummary,
    artefacts,
    failedOutputs,
    warnings,
    status: !artefacts.length
      ? "failed"
      : failedOutputs.length
        ? "partial"
        : "done",
  };
}
export function transformSingle(
  source: SourceContent,
  controls: OperatorControls,
  outputType: OutputType,
) {
  return transform(source, controls, [outputType]);
}
export { transformContent } from "../ai";
