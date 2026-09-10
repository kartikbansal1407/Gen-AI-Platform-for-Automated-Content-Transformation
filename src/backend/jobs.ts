import { ensureDefaultUser, getPool } from "./db";
import type { TransformationJob } from "@/lib/job-types";

export async function saveJob(
  job: TransformationJob,
  refinedType?: import("@/agent/transform-types").OutputType,
) {
  const userId = await ensureDefaultUser();
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const runtime = {
      warnings: job.warnings,
      failedOutputs: job.failedOutputs,
      outputTypes: job.outputTypes,
      overrides: job.overrides,
    };
    await client.query(
      `insert into transformation_jobs (id,user_id,source_summary,source_bundle,controls,status,created_at,runtime) values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict(id) do update set source_summary=excluded.source_summary, status=excluded.status,runtime=excluded.runtime,updated_at=now() where transformation_jobs.user_id=excluded.user_id`,
      [
        job.id,
        userId,
        job.sourceSummary,
        JSON.stringify(job.source),
        JSON.stringify(job.controls),
        job.status,
        job.createdAt,
        JSON.stringify(runtime),
      ],
    );
    if (refinedType) {
      await client.query(
        "delete from artefacts where job_id=$1 and output_type=$2",
        [job.id, refinedType],
      );
    } else {
      await client.query("delete from artefacts where job_id=$1", [job.id]);
    }
    for (const a of job.artefacts.filter(
      (artefact) => !refinedType || artefact.type === refinedType,
    ))
      await client.query(
        `insert into artefacts (job_id,output_type,title,body,metadata,confidence,warnings,source_attribution,claim_support) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          job.id,
          a.type,
          a.title,
          a.body,
          JSON.stringify({ ...a.metadata, mode: a.mode, review: a.review }),
          a.confidence,
          a.warnings,
          a.sourceAttribution,
          JSON.stringify(a.claimSupport ?? []),
        ],
      );
    await client.query("delete from source_documents where job_id=$1", [
      job.id,
    ]);
    for (const d of job.documents)
      await client.query(
        `insert into source_documents (job_id,filename,mime,size,parsed_text,metadata) values ($1,$2,$3,$4,$5,$6)`,
        [
          job.id,
          d.filename,
          d.mimeType,
          d.size,
          d.text,
          JSON.stringify({
            pages: d.pages,
            wordCount: d.wordCount,
            warnings: d.warnings,
          }),
        ],
      );
    await client.query(
      `insert into audit_logs (user_id,action,target_type,target_id,status,details) values ($1,$2,'transformation_jobs',$3,$4,$5)`,
      [
        userId,
        refinedType ? "job_refined" : "job_created",
        job.id,
        job.status,
        JSON.stringify({ outputs: job.outputTypes }),
      ],
    );
    for (const a of job.artefacts.filter(
      (a) => !refinedType || a.type === refinedType,
    ))
      await client.query(
        `insert into audit_logs (user_id,action,target_type,target_id,status,details) values ($1,$2,'transformation_jobs',$3,'done',$4)`,
        [
          userId,
          refinedType ? "artefact_refined" : "artefact_generated",
          job.id,
          JSON.stringify({ type: a.type, mode: a.mode }),
        ],
      );
    if (!refinedType)
      await client.query(
        `insert into analytics_events (user_id,event_type,value,metadata) values ($1,'transformation_completed',$2,$3)`,
        [
          userId,
          job.artefacts.length,
          JSON.stringify({ outputs: job.outputTypes, controls: job.controls }),
        ],
      );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
export async function getJob(id: string): Promise<TransformationJob | null> {
  const userId = await ensureDefaultUser();
  const pool = getPool();
  const result = await pool.query(
    "select * from transformation_jobs where id=$1 and user_id=$2",
    [id, userId],
  );
  const j = result.rows[0];
  if (!j) return null;
  const artefacts = await pool.query(
    "select * from artefacts where job_id=$1 order by created_at",
    [id],
  );
  const docs = await pool.query(
    "select * from source_documents where job_id=$1 order by created_at",
    [id],
  );
  return {
    id: j.id,
    source: j.source_bundle,
    sourceSummary: j.source_summary,
    controls: j.controls,
    createdAt: new Date(j.created_at).toISOString(),
    status: j.status,
    warnings: j.runtime.warnings ?? [],
    failedOutputs: j.runtime.failedOutputs ?? [],
    outputTypes: j.runtime.outputTypes ?? [],
    overrides: j.runtime.overrides ?? {},
    artefacts: artefacts.rows.map((a) => ({
      type: a.output_type,
      title: a.title,
      body: a.body,
      metadata: a.metadata,
      confidence: a.confidence,
      warnings: a.warnings,
      mode: a.metadata.mode,
      review: a.metadata.review,
      sourceAttribution: a.source_attribution,
      claimSupport: a.claim_support,
    })),
    documents: docs.rows.map((d) => ({
      filename: d.filename,
      mimeType: d.mime,
      size: d.size,
      text: d.parsed_text,
      pages: d.metadata?.pages,
      wordCount:
        d.metadata?.wordCount ??
        d.parsed_text.split(/\s+/).filter(Boolean).length,
      warnings: d.metadata?.warnings ?? [],
    })),
  };
}
export async function listJobs() {
  const userId = await ensureDefaultUser();
  const result = await getPool().query(
    "select id,source_summary,status,created_at from transformation_jobs where user_id=$1 order by created_at desc limit 50",
    [userId],
  );
  return result.rows.map((j) => ({
    id: j.id,
    sourceSummary: j.source_summary,
    status: j.status,
    createdAt: new Date(j.created_at).toISOString(),
  }));
}
export async function deleteJob(id: string) {
  const userId = await ensureDefaultUser();
  return (
    await getPool().query(
      "delete from transformation_jobs where id=$1 and user_id=$2",
      [id, userId],
    )
  ).rowCount;
}

export async function updateArtefactReview(
  id: string,
  outputType: string,
  review: import("@/lib/product").ArtefactReview,
) {
  const userId = await ensureDefaultUser();
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await client.query(
      `update artefacts a set metadata=jsonb_set(a.metadata,'{review}',$1::jsonb,true) from transformation_jobs j where a.job_id=j.id and j.id=$2 and j.user_id=$3 and a.output_type=$4 returning a.id`,
      [JSON.stringify(review), id, userId, outputType],
    );
    if (!result.rowCount) {
      await client.query("rollback");
      return false;
    }
    await client.query(
      `insert into audit_logs (user_id,action,target_type,target_id,status,details) values ($1,'artefact_reviewed','transformation_jobs',$2,$3,$4::jsonb)`,
      [userId, id, review.status, JSON.stringify({ outputType })],
    );
    await client.query("commit");
    return true;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
