import { NextResponse } from "next/server";
import { z } from "zod";
import { createAiCommandPlan, transformContent } from "@/agent/ai";
import { toArtefact } from "@/agent/transform";
import {
  operatorControlsSchema,
  sourceContentSchema,
  outputTypes,
  type OutputType,
  perOutputZodSchemas,
} from "@/agent/transform-types";
import { guardApi, readBoundedBody } from "@/lib/api-guard";
import { validateSourceMedia } from "@/lib/ingest-request";
import { getJob, saveJob } from "@/backend/jobs";
import { hasDatabase } from "@/backend/db";
const refineSchema = z.object({
  jobId: z.uuid().optional(),
  artefactType: z.enum(outputTypes as [OutputType, ...OutputType[]]),
  instruction: z.string().trim().min(3).max(2000),
  previousArtefact: z.unknown().optional(),
  source: sourceContentSchema.optional(),
  controls: operatorControlsSchema.optional(),
});
export async function POST(request: Request) {
  const denied = await guardApi(request, "transform");
  if (denied) return denied;
  try {
    const body = JSON.parse((await readBoundedBody(request)).toString("utf8"));
    if (body.instruction !== undefined) {
      const input = refineSchema.parse(body);
      const job =
        input.jobId && hasDatabase() ? await getJob(input.jobId) : null;
      const previous =
        job?.artefacts.find((a) => a.type === input.artefactType)?.metadata ??
        input.previousArtefact;
      const source = job?.source ?? input.source;
      const controls = job
        ? { ...job.controls, ...job.overrides[input.artefactType] }
        : input.controls;
      if (!source || !controls || !previous)
        return NextResponse.json(
          {
            error:
              "Original source, controls and previous artefact are required for refinement.",
          },
          { status: 400 },
        );
      validateSourceMedia(source);
      const validatedPrevious =
        perOutputZodSchemas[input.artefactType].parse(previous);
      const response = await transformContent({
        source,
        controls,
        outputType: input.artefactType,
        refinement: {
          previousArtefact: validatedPrevious,
          instruction: input.instruction,
        },
      });
      const artefact = toArtefact(input.artefactType, response);
      if (job) {
        job.artefacts = job.artefacts.map((a) =>
          a.type === input.artefactType ? artefact : a,
        );
        await saveJob(job, input.artefactType);
      }
      return NextResponse.json({ artefact, mode: response.mode });
    }
    const { command } = z
      .object({ command: z.string().trim().min(3).max(1200) })
      .parse(body);
    return NextResponse.json(await createAiCommandPlan(command));
  } catch {
    return NextResponse.json(
      { error: "Unable to refine. Check the source, job and instruction." },
      { status: 400 },
    );
  }
}
