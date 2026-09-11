"use client";
import { useState, useEffect, useRef } from "react";
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
    const url = `data:${mime};base64,${base64}`;
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
  }
}

function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

function VideoPlayer({ artefact }: { artefact: Artefact }) {
  const meta = artefact.metadata as Record<string, unknown>;
  const scenes = (meta.storyboard as { visual: string; duration: string; transition: string; caption: string }[]) || [];
  const narration = (meta.narration as string) || "";
  const srt = (meta.srt as string) || "";
  const script = (meta.script as string) || "";
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing || scenes.length === 0) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = window.setInterval(() => setIdx((i) => (i + 1) % scenes.length), 3200);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [playing, scenes.length]);

  const toggleSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(narration.slice(0, 4000));
    u.rate = 0.95; u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  if (!scenes.length) return null;
  const cur = scenes[idx];
  return (
    <div className="mt-4 space-y-3 rounded-lg border border-current/10 bg-black p-3 text-white">
      <div className="flex items-center justify-between text-xs opacity-70">
        <span>VIDEO PREVIEW — {scenes.length} scenes • Watchable slideshow</span>
        <span className="rounded bg-white/10 px-2 py-1">{idx + 1} / {scenes.length} • {cur.duration} • {cur.transition}</span>
      </div>
      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <p className="max-w-2xl text-lg font-semibold leading-6">{cur.visual}</p>
          <p className="mt-3 max-w-xl text-sm opacity-80">{cur.caption}</p>
          <p className="mt-4 text-xs opacity-50">{cur.transition} • {cur.duration}</p>
        </div>
        <div className="absolute bottom-2 left-2 right-2 flex gap-1">
          {scenes.map((_, i) => <div key={i} className={`h-1 flex-1 rounded ${i === idx ? "bg-teal-400" : "bg-white/20"}`} />)}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setPlaying((v) => !v)} className="h-9 rounded-md bg-teal-600 px-4 text-sm font-medium text-white">{playing ? "Pause" : "Play"} Preview</button>
        <button onClick={() => setIdx((i) => (i - 1 + scenes.length) % scenes.length)} className="h-9 rounded-md border border-white/15 px-3 text-xs text-white">Prev</button>
        <button onClick={() => setIdx((i) => (i + 1) % scenes.length)} className="h-9 rounded-md border border-white/15 px-3 text-xs text-white">Next</button>
        <button onClick={toggleSpeech} className="h-9 rounded-md border border-white/15 px-3 text-xs text-white">{speaking ? "Stop Audio" : "Play Audio"} (browser)</button>
      </div>
      <div className="grid gap-2 rounded-md bg-white/5 p-3 text-xs leading-5">
        <div><span className="font-semibold">Script:</span> <span className="opacity-80">{script.slice(0, 900)}</span></div>
        <div><span className="font-semibold">Narration:</span> <span className="opacity-80">{narration.slice(0, 600)}</span></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => downloadText(`video-script.txt`, script)} className="h-8 rounded-md border border-white/15 px-3 text-xs text-white">Download Script</button>
        <button onClick={() => downloadText(`video-subtitles.srt`, srt, "text/srt")} className="h-8 rounded-md border border-white/15 px-3 text-xs text-white">Download SRT</button>
        <button onClick={() => downloadText(`video-storyboard.json`, JSON.stringify(scenes, null, 2), "application/json")} className="h-8 rounded-md border border-white/15 px-3 text-xs text-white">Download Storyboard JSON</button>
      </div>
      <p className="text-xs opacity-50">Tip: This is a watchable storyboard preview. For broadcast MP4 with ElevenLabs voice, set ELEVENLABS_API_KEY and re-generate — audio will be embedded.</p>
    </div>
  );
}

function FormattedText({ text }: { text: string }) {
  return (
    <div className="mt-2 space-y-0 rounded bg-current/5 p-3 text-sm leading-6">
      {text.split("\n").map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;
        const isHeading = /^[A-Z][A-Z\s—-]+$/.test(trimmed) && trimmed.length < 60 && !trimmed.includes("•");
        if (isHeading) return <div key={i} className="mt-3 font-bold tracking-wide text-xs opacity-80">{trimmed}</div>;
        if (trimmed.startsWith("•") || trimmed.startsWith("-")) return <div key={i} className="ml-3 flex gap-2"><span className="opacity-60">•</span><span>{trimmed.slice(1).trim()}</span></div>;
        if (/^\d+\./.test(trimmed)) return <div key={i} className="ml-1">{trimmed}</div>;
        return <div key={i}>{trimmed}</div>;
      })}
    </div>
  );
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
        {(a.type === "Advisory" || a.type === "ExecutiveSummary") ? (
          <FormattedText text={a.body} />
        ) : a.type === "Video" ? (
          <>
            <FormattedText text={a.body} />
            <VideoPlayer artefact={a} />
          </>
        ) : a.type === "Presentation" || a.type === "Infographic" ? (
          <>
            <FormattedText text={a.body} />
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
          </>
        ) : (
          <pre className="mt-2 whitespace-pre-wrap rounded bg-current/5 p-3 text-sm max-h-[420px] overflow-auto">{a.body}</pre>
        )}
        {a.type === "Presentation" && pptxBase64 ? null : null}
        {a.warnings.length? <p className="mt-2 text-xs opacity-60">Warnings: {a.warnings.join("; ")}</p>:null}
        <p className="mt-1 text-xs opacity-60">Confidence {a.confidence}%</p>
      </div>:null}
    </div>
  );
}
