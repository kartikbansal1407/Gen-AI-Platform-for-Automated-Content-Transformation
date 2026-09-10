import { NextResponse } from "next/server";
import { z } from "zod";
import { describeImageViaVision } from "@/agent/ai";
import { imageInputSchema } from "@/agent/transform-types";
import { guardApi, readBoundedBody } from "@/lib/api-guard";
import { validateSourceMedia } from "@/lib/ingest-request";
export async function POST(request: Request) {
  const denied = await guardApi(request, "ingest");
  if (denied) return denied;
  try {
    const { image } = z
      .object({ image: imageInputSchema })
      .parse(
        JSON.parse(
          (await readBoundedBody(request, 15 * 1024 * 1024)).toString("utf8"),
        ),
      );
    validateSourceMedia({ images: [image] });
    return NextResponse.json(await describeImageViaVision(image));
  } catch {
    return NextResponse.json(
      { error: "Provide a valid PNG, JPEG or WEBP image of at most 10 MB." },
      { status: 400 },
    );
  }
}
