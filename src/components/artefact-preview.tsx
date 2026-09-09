"use client";
import { useState } from "react";
import type { Artefact } from "@/lib/types";

function downloadBase64(filename: string, base64: string, mime: string) {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  } catch {
    // fallback to data URI
    const url = `data:${mime};base64,${base64}`;
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
  }
}

export function ArtefactPreview({ artefacts }: { artefacts: Artefact[] }) {
  const [active, setActive] = useState(0);
  const a = artefacts[active];
  if (!artefacts.length) return null;
  const meta = a?.metadata as Record<string, unknown> | undefined;
  const pptxBase64 = meta?.pptxBase64 as string | undefined;
  const pptxFileName = (meta?.pptxFileName as string) || "Content-Forge.pptx";
  const imageDataUrl = meta?.imageDataUrl as string | undefined;
  const svg = meta?.svg as string | undefined;

  return (
    <div className="rounded-lg border border-current/10 p-4">
      <div className="flex flex-wrap gap-2">{artefacts.map((art,i)=><button key={art.type} onClick={()=>setActive(i)} className={`rounded px-3 py-2 text-sm border ${i===active?"bg-current/10":""}`}>{art.type}</button>)}</div>
      {a ? <div className="mt-4">
        <h4 className="font-semibold">{a.title}</h4>
        <pre className="mt-2 whitespace-pre-wrap rounded bg-current/5 p-3 text-sm max-h-[420px] overflow-auto">{a.body}</pre>
        {a.type === "Presentation" && pptxBase64 && (
          <button onClick={() => downloadBase64(pptxFileName, pptxBase64, "application/vnd.openxmlformats-officedocument.presentationml.presentation")}
            className="mt-3 h-10 rounded-md bg-teal-600 px-4 text-sm font-medium text-white">Download PPT ({pptxFileName})</button>
        )}
        {a.type === "Infographic" && imageDataUrl && (
          <div className="mt-3 space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageDataUrl} alt="infographic" className="w-full max-w-[800px] rounded-lg border border-current/10" />
            <div className="flex gap-2">
              <button onClick={() => downloadBase64(`infographic.svg`, typeof window !== "undefined" ? btoa(unescape(encodeURIComponent(svg || ""))) : "", "image/svg+xml")} className="h-9 rounded-md border px-3 text-xs">Download SVG</button>
              <a href={imageDataUrl} download="infographic.svg" className="h-9 rounded-md border px-3 text-xs inline-flex items-center">Open image</a>
            </div>
          </div>
        )}
        {a.type === "Infographic" && !imageDataUrl && <p className="mt-2 text-xs opacity-60">Infographic text generated — image will appear after refresh when Gemini is set, or uses fallback SVG.</p>}
        {a.warnings.length? <p className="mt-2 text-xs opacity-60">Warnings: {a.warnings.join("; ")}</p>:null}
        <p className="mt-1 text-xs opacity-60">Confidence {a.confidence}%</p>
      </div>:null}
    </div>
  );
}
