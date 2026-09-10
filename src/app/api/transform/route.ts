import { NextResponse } from "next/server";
import { z } from "zod";
import { transform } from "@/agent/transform";
import {
  operatorControlsSchema,
  outputTypes,
  sourceContentSchema,
  type OutputType,
} from "@/agent/transform-types";
import { guardApi } from "@/lib/api-guard";
import { readIngestRequest } from "@/lib/ingest-request";
import { hasDatabase } from "@/backend/db";
import { saveJob } from "@/backend/jobs";
import type { TransformationJob, TransformEvent } from "@/lib/job-types";
export const runtime = "nodejs";
export const maxDuration = 300;
const outputSchema = z.enum(outputTypes as [OutputType, ...OutputType[]]);
const requestSchema = z
  .object({
    controls: operatorControlsSchema,
    outputTypes: z
      .array(outputSchema)
      .min(1)
      .max(7)
      .refine(
        (v) => new Set(v).size === v.length,
        "Duplicate outputs are not allowed.",
      )
      .optional(),
    outputType: outputSchema.optional(),
    overrides: z
      .partialRecord(outputSchema, operatorControlsSchema.partial())
      .optional(),
    documents: z
      .array(
        z.object({
          filename: z.string().max(255),
          mimeType: z.string().max(120),
          size: z.number().int().min(0).max(10485760),
          text: z.string().max(50000),
          pages: z.number().optional(),
          wordCount: z.number(),
          warnings: z.array(z.string()),
        }),
      )
      .max(10)
      .optional(),
  })
  .refine(
    (v) => Boolean(v.outputTypes?.length || v.outputType),
    "Select at least one output.",
  );

export async function POST(request: Request) {
  const denied = await guardApi(request, "transform");
  if (denied) return denied;
  try {
    const ingested = await readIngestRequest(request);
    const fields = requestSchema.parse(ingested.fields);
    const source = sourceContentSchema.parse(ingested.source);
    const requested = fields.outputTypes ?? [fields.outputType!];
    const run = async (onEvent?: (event: TransformEvent) => void) => {
      const result = await transform(source, fields.controls, requested, {
        overrides: fields.overrides,
        onEvent,
      });
      const job: TransformationJob = {
        ...result,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        source,
        controls: fields.controls,
        outputTypes: requested,
        overrides: fields.overrides ?? {},
        documents: ingested.documents.length
          ? ingested.documents
          : (fields.documents ?? []),
      };
      job.warnings.push(...ingested.warnings);
      let mode: "database" | "browser" = "browser";
      if (hasDatabase()) {
        try {
          await saveJob(job);
          mode = "database";
        } catch {
          job.warnings.push(
            "Database save failed. This job is available in browser history; check database migrations.",
          );
        }
      }
      return { job, mode };
    };
    if (request.headers.get("accept")?.includes("application/x-ndjson")) {
      const encoder = new TextEncoder();
      let closed = false;
      const stream = new ReadableStream({
        async start(controller) {
          const emit = (event: TransformEvent) => {
            if (!closed)
              controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
          };
          try {
            const result = await run(emit);
            emit({ event: "complete", ...result });
          } catch {
            emit({
              event: "error",
              error: "Transformation failed. Retry after checking the source.",
            });
          } finally {
            if (!closed) controller.close();
          }
        },
        cancel() {
          closed = true;
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    const { job, mode } = await run();
    // Retain the previous single-output response fields for existing clients.
    const first = job.artefacts[0];
    return NextResponse.json({
      ...job,
      job,
      jobId: job.id,
      mode: fields.outputType ? (first?.mode ?? "demo") : mode,
      storageMode: mode,
      ...(fields.outputType && first
        ? { result: first.metadata, ...first.metadata }
        : {}),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Invalid source, controls, or output selection."
            : error instanceof Error
              ? error.message
              : "Invalid request.",
      },
      { status: 400 },
    );
  }
}
export async function GET() {
  return NextResponse.json({
    outputTypes,
    accepts: ["application/json", "multipart/form-data"],
    stream: "application/x-ndjson",
  });
}
