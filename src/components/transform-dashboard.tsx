"use client";
import { useState } from "react";
import type { OutputType, TransformControls } from "@/lib/types";
import { ControlsPanel } from "./controls-panel";
import { IngestDropzone } from "./ingest-dropzone";
import { OutputSelector } from "./output-selector";
import { ArtefactPreview } from "./artefact-preview";
import type { Artefact } from "@/lib/types";

const defaultControls: TransformControls = {
  audience: "NTRO analysts",
  tone: "Analytical",
  language: "English",
  detail: "Standard",
  objective: "Inform",
  style: "Professional",
  outputs: ["LinkedIn", "ExecutiveSummary"],
};

export function TransformDashboard() {
  const [text, setText] = useState("India's AI policy and public institutions — source briefing for transformation.");
  const [url, setUrl] = useState("");
  const [docs, setDocs] = useState<{ filename: string; mime: string; text: string }[]>([]);
  const [controls, setControls] = useState<TransformControls>(defaultControls);
  const [artefacts, setArtefacts] = useState<Artefact[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/transform", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, url: url || undefined, docs: docs.length ? docs : undefined, controls }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? JSON.stringify(data.error) : "Failed");
      setArtefacts(data.artefacts);
      try { localStorage.setItem("content-forge:last-job", JSON.stringify(data)); } catch {}
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Content Forge — Transform</h1>
      <p className="text-sm opacity-70">Source → Controls → Outputs • PDFs, PPTs, docs, images supported • PPT & infographic images generated</p>
      <IngestDropzone text={text} setText={setText} url={url} setUrl={setUrl} docs={docs} setDocs={setDocs} />
      <ControlsPanel controls={controls} setControls={setControls} />
      <OutputSelector selected={controls.outputs} onChange={(outputs: OutputType[]) => setControls({ ...controls, outputs })} />
      <button onClick={handleGenerate} disabled={loading || controls.outputs.length===0} className="h-11 rounded-md bg-[#111] px-6 text-white disabled:opacity-40">{loading ? "Generating… real PPT will download" : "Generate — make PPT"}</button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {artefacts ? <ArtefactPreview artefacts={artefacts} /> : null}
    </div>
  );
}
