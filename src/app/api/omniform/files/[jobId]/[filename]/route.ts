import { guardApi } from "@/lib/api-guard";

const backendUrl = () =>
  process.env.OMNIFORM_API_URL ?? "http://127.0.0.1:8000";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string; filename: string }> },
) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const { jobId, filename } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(jobId) || !/^[a-z0-9_.-]+$/i.test(filename))
    return new Response("Not found", { status: 404 });
  try {
    const upstream = await fetch(
      `${backendUrl()}/api/files/${encodeURIComponent(jobId)}/${encodeURIComponent(filename)}`,
      { signal: AbortSignal.timeout(280_000) },
    );
    if (!upstream.ok || !upstream.body)
      return new Response("Artifact not found", { status: upstream.status });
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/octet-stream",
        "content-disposition":
          upstream.headers.get("content-disposition") ??
          `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return new Response("OmniForm backend is unavailable", { status: 503 });
  }
}
