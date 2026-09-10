import { reviewSchema } from "@/lib/product";
import { outputTypes } from "@/agent/transform-types";
import { readBoundedBody } from "@/lib/api-guard";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabase } from "@/backend/db";
import { getJob, deleteJob, updateArtefactReview } from "@/backend/jobs";
import { guardApi } from "@/lib/api-guard";
type Context = { params: Promise<{ id: string }> };
async function handle(request: Request, context: Context, remove: boolean) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success)
    return NextResponse.json({ error: "Invalid job ID." }, { status: 400 });
  if (!hasDatabase())
    return NextResponse.json(
      { error: "Job is stored in browser history.", mode: "browser" },
      { status: 404 },
    );
  try {
    const result = remove ? await deleteJob(id) : await getJob(id);
    return result
      ? NextResponse.json(
          remove ? { ok: true } : { job: result, mode: "database" },
        )
      : NextResponse.json({ error: "Job not found." }, { status: 404 });
  } catch {
    return NextResponse.json(
      { error: "Job storage unavailable." },
      { status: 503 },
    );
  }
}
export function GET(request: Request, context: Context) {
  return handle(request, context, false);
}
export function DELETE(request: Request, context: Context) {
  return handle(request, context, true);
}

export async function PATCH(request: Request, context: Context) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success)
    return NextResponse.json({ error: "Invalid job ID." }, { status: 400 });
  const schema = z.object({
    outputType: z.enum(outputTypes),
    review: reviewSchema,
  });
  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(
      JSON.parse((await readBoundedBody(request, 10000)).toString("utf8")),
    );
  } catch (error) {
    const tooLarge =
      error instanceof Error && error.message === "Request body too large.";
    return NextResponse.json(
      {
        error: tooLarge
          ? "Review request too large."
          : "Invalid review decision.",
      },
      { status: tooLarge ? 413 : 400 },
    );
  }
  try {
    if (!hasDatabase())
      return NextResponse.json(
        { error: "Job is stored in browser history." },
        { status: 404 },
      );
    const review = { ...input.review, updatedAt: new Date().toISOString() };
    if (!(await updateArtefactReview(id, input.outputType, review)))
      return NextResponse.json(
        { error: "Artefact not found." },
        { status: 404 },
      );
    return NextResponse.json({ review });
  } catch {
    return NextResponse.json(
      { error: "Unable to save review." },
      { status: 503 },
    );
  }
}
