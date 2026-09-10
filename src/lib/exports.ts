import JSZip from "jszip";
import type { Artefact, TransformationJob } from "./job-types";
export function downloadFile(
  content: BlobPart,
  name: string,
  type = "text/markdown",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function artefactFiles(artefact: Artefact) {
  const m = artefact.metadata;
  const files: Array<{ name: string; content: string; base64?: boolean }> = [
    { name: `${artefact.type}.md`, content: artefact.body },
    {
      name: `${artefact.type}.json`,
      content: JSON.stringify(artefact, null, 2),
    },
  ];
  if (typeof m.srt === "string")
    files.push({ name: "subtitles.srt", content: m.srt });
  if (typeof m.vtt === "string")
    files.push({ name: "subtitles.vtt", content: m.vtt });
  const audio = m.videoNarration as { audioBase64?: string } | undefined;
  if (audio?.audioBase64)
    files.push({
      name: "narration.mp3",
      content: audio.audioBase64,
      base64: true,
    });
  const deck = m.presentationDeck as
    { fileBase64?: string; downloadUrl?: string } | undefined;
  if (deck?.fileBase64)
    files.push({
      name: "presentation.pptx",
      content: deck.fileBase64,
      base64: true,
    });
  if (deck?.downloadUrl)
    files.push({
      name: "presentation-download.txt",
      content: deck.downloadUrl,
    });
  const image = m.generatedImage as { imageBase64?: string } | undefined;
  if (image?.imageBase64)
    files.push({
      name: "infographic.png",
      content: image.imageBase64,
      base64: true,
    });
  return files;
}
export async function buildJobZip(job: TransformationJob) {
  const zip = new JSZip();
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        id: job.id,
        createdAt: job.createdAt,
        controls: job.controls,
        overrides: job.overrides,
        status: job.status,
        warnings: job.warnings,
        failedOutputs: job.failedOutputs,
      },
      null,
      2,
    ),
  );
  zip.file("source-summary.txt", job.sourceSummary);
  for (const artefact of job.artefacts)
    for (const file of artefactFiles(artefact))
      zip.file(`${artefact.type}/${file.name}`, file.content, {
        base64: file.base64,
      });
  return zip.generateAsync({ type: "uint8array" });
}
