export type PresentationSlide = {
  title: string;
  bullets: string[];
  speakerNotes?: string;
  visualPrompt?: string;
};
export type PresentationPayload = {
  title: string;
  slides: PresentationSlide[];
  audience?: string;
  language?: string;
};
export type PresentonResult = {
  mode: "presenton" | "demo";
  downloadUrl?: string;
  fileBase64?: string;
  fileName?: string;
  warnings: string[];
  presentonResponse?: unknown;
};

// Contract: https://docs.presenton.ai/using-presenton-api
export async function generatePresentonDeck(
  payload: PresentationPayload,
): Promise<PresentonResult> {
  const baseUrl = process.env.PRESENTON_API_URL;
  if (!baseUrl)
    return {
      mode: "demo",
      warnings: [
        "Presenton not configured; Markdown slides and speaker notes remain available.",
      ],
    };
  try {
    const response = await fetch(
      new URL("/api/v1/ppt/presentation/generate", baseUrl),
      {
        method: "POST",
        signal: AbortSignal.timeout(90000),
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.PRESENTON_API_KEY
            ? { Authorization: `Bearer ${process.env.PRESENTON_API_KEY}` }
            : {}),
        },
        body: JSON.stringify({
          content: JSON.stringify(payload),
          n_slides: payload.slides.length,
          language: payload.language ?? "English",
          template: "general",
          export_as: "pptx",
          web_search: false,
          instructions:
            "Preserve the provided slide content and speaker notes. Do not add unsupported claims.",
        }),
      },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = (await response.json()) as { path?: string };
    if (typeof json.path !== "string")
      throw new Error("No downloadable presentation returned");
    const downloadUrl = new URL(json.path, baseUrl);
    if (!["http:", "https:"].includes(downloadUrl.protocol))
      throw new Error("Invalid presentation URL");
    return {
      mode: "presenton",
      downloadUrl: downloadUrl.href,
      fileName: "presentation.pptx",
      warnings: [],
    };
  } catch {
    return {
      mode: "demo",
      warnings: [
        "Presenton generation failed; Markdown slides and speaker notes remain available.",
      ],
    };
  }
}

export { presentationOutputSchema } from "../transform-types";
export async function generatePresentation(
  source: import("../transform-types").SourceContent,
  controls: import("../transform-types").OperatorControls,
) {
  const { transformContent } = await import("../ai");
  return transformContent({ source, controls, outputType: "presentation" });
}
