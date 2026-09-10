"use client";

import { useState } from "react";
import { FileText, Film, ImageIcon, Presentation, Megaphone, FileWarning, ClipboardList, Sparkles, Loader2, ExternalLink } from "lucide-react";
import type { OutputType } from "@/agent/transform-types";

type OperatorControls = {
  audience: string;
  tone: string;
  language: string;
  detailLevel: "brief" | "standard" | "detailed";
  objective: "Reach" | "Credibility" | "Conversations" | "Networking" | "Opportunity" | "Thought leadership" | "Relationships" | "Authority" | "Followers";
  style: string;
};

const outputOptions: Array<{ id: OutputType; label: string; desc: string; icon: typeof FileText }> = [
  { id: "linkedin_post", label: "LinkedIn Post", desc: "Professional post", icon: Megaphone },
  { id: "twitter_post", label: "Twitter / X Post", desc: "Thread (280c)", icon: Megaphone },
  { id: "advisory", label: "Advisory", desc: "Govt advisory doc", icon: FileWarning },
  { id: "infographic", label: "Infographic", desc: "Visual summary + image", icon: ImageIcon },
  { id: "executive_summary", label: "Executive Summary", desc: "Condensed brief", icon: ClipboardList },
  { id: "video_package", label: "Video Package", desc: "Script + ElevenLabs audio", icon: Film },
  { id: "presentation", label: "Presentation", desc: "Slides via Presenton", icon: Presentation },
];

const defaultControls: OperatorControls = {
  audience: "Young policy researchers",
  tone: "analytical",
  language: "English",
  detailLevel: "standard",
  objective: "Credibility",
  style: "analytical",
};

export function ContentForge() {
  const [sourceText, setSourceText] = useState("India's AI policy needs institutional imagination, with focus on NTRO advisory capacity and state capacity for secure communications.");
  const [linkUrl, setLinkUrl] = useState("");
  const [controls, setControls] = useState<OperatorControls>(defaultControls);
  const [outputType, setOutputType] = useState<OutputType>("linkedin_post");
  const [imagePreviews, setImagePreviews] = useState<Array<{ url?: string; base64?: string; mimeType?: string; altText?: string }>>([]);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<{ base64?: string; mimeType?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [mode, setMode] = useState<string>("demo");
  const [error, setError] = useState<string | null>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const next: typeof imagePreviews = [];
    for (const file of Array.from(files).slice(0, 4)) {
      const base64 = await fileToBase64(file);
      next.push({ base64: base64.split(",")[1], mimeType: file.type || "image/jpeg", altText: file.name });
    }
    setImagePreviews(next);
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    const base64 = await fileToBase64(file);
    setVideoData({ base64: base64.split(",")[1], mimeType: file.type || "video/mp4" });
  }

  async function runTransform() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const source: Record<string, unknown> = {
        text: sourceText || undefined,
        linkUrl: linkUrl.trim() || undefined,
      };
      if (imagePreviews.length > 0) source.images = imagePreviews;
      if (videoData?.base64) source.video = { base64: videoData.base64, mimeType: videoData.mimeType, keyframes: [] };

      const res = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, controls, outputType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Transform failed");
      setMode(json.mode ?? "demo");
      setResult(json);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-current/10 bg-white/60 p-5 shadow-sm dark:bg-white/[0.035]">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Sparkles className="size-5" /> Content Forge</h1>
        <p className="mt-2 text-sm leading-6 opacity-70 max-w-3xl">
          SIH 26154 — Gen AI Platform for Automated Content Transformation (NTRO). Paste source content (text, report, advisory, link, images, video) + set Operator Controls → generate any of 7 outputs. Gemini/OpenAI dual-provider, JSON-schema structured, vision & video best-effort, govt advisory safety with source attribution.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4 rounded-lg border border-current/10 bg-white/60 p-4 dark:bg-white/[0.035]">
          <h2 className="font-semibold flex items-center gap-2"><FileText className="size-4" /> Source Content</h2>
          <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="Paste article, report, advisory, threat intel, policy doc, or free-form prompt…" className="min-h-36 w-full resize-none rounded-md border border-current/10 bg-transparent p-3 text-sm leading-6 outline-none" />

          <label className="text-sm font-medium">Link URL (optional – fetched + images extracted)</label>
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com/report" className="h-10 w-full rounded-md border border-current/10 bg-transparent px-3 text-sm outline-none" />

          <label className="text-sm font-medium">Images (direct uploads – vision described before transform)</label>
          <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="w-full text-sm" />
          {imagePreviews.length > 0 && <div className="text-xs opacity-60">{imagePreviews.length} image(s) ready – will be sent to multimodal endpoint.</div>}

          <label className="text-sm font-medium">Video (audio transcribed via Whisper/Gemini + keyframes)</label>
          <input type="file" accept="video/*" onChange={handleVideoUpload} className="w-full text-sm" />
          {videoPreview && <video src={videoPreview} controls className="mt-2 max-h-48 w-full rounded-md" />}

          <div className="rounded-md bg-current/5 p-3 text-xs leading-5 opacity-70">
            <div className="font-medium">Input handling</div>
            Articles, reports, advisories, threat intel, policy docs, research papers, announcements, incident reports, free-form prompts, and URLs. Link images + uploaded images go through vision first. Video is best-effort (transcript + frames) – never blocks the rest.
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-current/10 bg-white/60 p-4 dark:bg-white/[0.035]">
          <h2 className="font-semibold">Operator Controls</h2>
          <div className="grid gap-3">
            <LabeledInput label="Audience" value={controls.audience} onChange={(v) => setControls({ ...controls, audience: v })} />
            <LabeledSelect label="Tone" value={controls.tone} onChange={(v) => setControls({ ...controls, tone: v })} options={["analytical","formal","conversational","narrative","assertive"]} />
            <LabeledSelect label="Language" value={controls.language} onChange={(v) => setControls({ ...controls, language: v })} options={["English","Hindi","Bilingual EN/HI","Tamil","Bengali"]} />
            <LabeledSelect label="Detail level" value={controls.detailLevel} onChange={(v) => setControls({ ...controls, detailLevel: v as OperatorControls["detailLevel"] })} options={["brief","standard","detailed"]} />
            <LabeledSelect label="Objective" value={controls.objective} onChange={(v) => setControls({ ...controls, objective: v as OperatorControls["objective"] })} options={["Reach","Credibility","Conversations","Networking","Opportunity","Thought leadership","Relationships","Authority","Followers"]} />
            <LabeledSelect label="Style" value={controls.style} onChange={(v) => setControls({ ...controls, style: v })} options={["analytical","narrative","bullet-point","persuasive","technical"]} />
          </div>

          <h3 className="pt-2 text-sm font-semibold">Output type</h3>
          <div className="grid grid-cols-2 gap-2">
            {outputOptions.map(({ id, label, desc, icon: Icon }) => (
              <button key={id} onClick={() => setOutputType(id)} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${outputType === id ? "bg-current/10 border-current/20" : "border-current/10 hover:bg-current/5"}`}>
                <Icon className="size-4 shrink-0" />
                <span><span className="font-medium">{label}</span><span className="block text-xs opacity-60">{desc}</span></span>
              </button>
            ))}
          </div>

          <button onClick={runTransform} disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#111] text-white disabled:opacity-50 dark:bg-[#f6f3ed] dark:text-[#111]">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {busy ? "Transforming…" : `Generate ${outputOptions.find(o=>o.id===outputType)?.label}`}
          </button>

          <div className="text-xs opacity-60">AI: {mode} • Safety: no fabricated facts, flag weak claims, cite source spans, no spam/engagement-bait • Infographic image via Gemini/OpenAI image model • Video audio via ElevenLabs • Presentation via Presenton</div>
          {error && <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700">{error}</div>}
        </div>
      </div>

      {result && <ResultView outputType={outputType} result={result} />}
    </div>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-sm">
      <span className="opacity-70">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-current/10 bg-transparent px-3 outline-none" />
    </label>
  );
}
function LabeledSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="text-sm">
      <span className="opacity-70">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-current/10 bg-transparent px-2 outline-none">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function ResultView({ outputType, result }: { outputType: OutputType; result: Record<string, unknown> }) {
  const r = (result.result ?? {}) as Record<string, unknown>;
  const warnings = (r.warnings as string[] | undefined) ?? [];
  const attribution = r.sourceAttribution as string | undefined;
  const claimSupport = r.claimSupport as Array<{ claim: string; supported: boolean; sourceEvidence: string; flagIfWeak: boolean }> | undefined;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-current/10 bg-white/60 p-4 dark:bg-white/[0.035]">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">{String(r.title ?? outputType)} <span className="ml-2 rounded bg-current/10 px-2 py-0.5 text-xs">{String(result.mode)}</span></h3>
          <span className="text-xs opacity-60">confidence: {String((r as Record<string, unknown>).confidence ?? "—")}%</span>
        </div>

        {outputType === "linkedin_post" && (
          <div className="mt-3 space-y-2">
            <p className="whitespace-pre-wrap text-sm leading-6">{String(r.body ?? "")}</p>
            {(r.hashtags as string[] | undefined)?.length ? <div className="text-xs opacity-60">{(r.hashtags as string[]).join(" ")}</div> : null}
          </div>
        )}

        {outputType === "twitter_post" && (
          <div className="mt-3 space-y-2">
            {((r.tweets as string[] | undefined) ?? []).map((t, i) => (
              <div key={i} className="rounded-md border border-current/10 p-3 text-sm leading-6">{i + 1}. {t}</div>
            ))}
          </div>
        )}

        {outputType === "advisory" && (
          <div className="mt-3 space-y-2 text-sm">
            <div className="rounded bg-amber-500/10 px-2 py-1 text-xs font-medium inline-block">{String(r.classification ?? "")}</div>
            <p className="leading-6">{String(r.summary ?? "")}</p>
            <ul className="list-disc pl-5 space-y-1">{((r.keyPoints as string[] | undefined) ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
            <div className="font-medium">Recommendations</div>
            <ul className="list-disc pl-5 space-y-1">{((r.recommendations as string[] | undefined) ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
          </div>
        )}

        {outputType === "infographic" && (
          <div className="mt-3 space-y-3 text-sm">
            <div className="font-medium">{String(r.headline ?? "")}</div>
            <div className="grid gap-2 md:grid-cols-3">{((r.keyStats as Array<{ label: string; value: string; sourceSpan: string }> | undefined) ?? []).map((s) => (
              <div key={s.label} className="rounded-md border border-current/10 p-3"><div className="text-xs opacity-60">{s.label}</div><div className="text-lg font-semibold">{s.value}</div><div className="mt-1 text-xs opacity-60">Source: {s.sourceSpan.slice(0, 80)}…</div></div>
            ))}</div>
            {((r.sections as Array<{ heading: string; bullets: string[] }> | undefined) ?? []).map((sec) => (
              <div key={sec.heading}><div className="font-medium">{sec.heading}</div><ul className="list-disc pl-5">{sec.bullets.map((b) => <li key={b}>{b}</li>)}</ul></div>
            ))}
            <div className="text-xs opacity-60">Image prompt: {String(r.imagePrompt ?? "").slice(0, 180)}…</div>
            {(result.generatedImage as { imageBase64?: string; imageUrl?: string } | undefined)?.imageBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`data:image/png;base64,${(result.generatedImage as { imageBase64: string }).imageBase64}`} alt="Infographic" className="max-h-[480px] w-full rounded-md border object-contain" />
            ) : (result.generatedImage as { imageUrl?: string } | undefined)?.imageUrl ? (
              <a href={(result.generatedImage as { imageUrl: string }).imageUrl} target="_blank" className="inline-flex items-center gap-1 text-xs underline"><ExternalLink className="size-3" /> Open generated image</a>
            ) : (
              <div className="rounded-md border border-dashed p-3 text-xs opacity-60">Image generation best-effort – {(result.generatedImage as { mode?: string } | undefined)?.mode === "demo" ? "demo (add GEMINI_API_KEY or OPENAI_API_KEY for live image)" : "pending"}</div>
            )}
          </div>
        )}

        {outputType === "executive_summary" && (
          <div className="mt-3 space-y-2 text-sm leading-6">
            <p>{String(r.summary ?? "")}</p>
            <div className="font-medium">Key points</div><ul className="list-disc pl-5">{((r.keyPoints as string[] | undefined) ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
            <div className="font-medium">Implications</div><ul className="list-disc pl-5">{((r.implications as string[] | undefined) ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
          </div>
        )}

        {outputType === "video_package" && (
          <div className="mt-3 space-y-2 text-sm">
            <p className="whitespace-pre-wrap leading-6">{String(r.script ?? "")}</p>
            <div className="rounded-md bg-current/5 p-3"><div className="text-xs font-medium">Narration</div><p className="mt-1 leading-6">{String(r.narrationText ?? "")}</p></div>
            <div className="grid gap-2">{((r.scenes as Array<{ title: string; description: string; durationSeconds: number }> | undefined) ?? []).map((s) => (
              <div key={s.title} className="rounded-md border border-current/10 p-3"><div className="font-medium">{s.title} — {s.durationSeconds}s</div><div className="text-sm opacity-70">{s.description}</div></div>
            ))}</div>
            {(result.videoNarration as { audioBase64?: string; mode?: string; warnings?: string[] } | undefined)?.audioBase64 ? (
              <audio controls src={`data:audio/mpeg;base64,${(result.videoNarration as { audioBase64: string }).audioBase64}`} className="w-full" />
            ) : (
              <div className="rounded-md border border-dashed p-3 text-xs opacity-60">Narration audio: {(result.videoNarration as { mode?: string })?.mode === "elevenlabs" ? "ready" : "demo – add ELEVENLABS_API_KEY for live TTS"} – warnings: {((result.videoNarration as { warnings?: string[] })?.warnings ?? []).join("; ")}</div>
            )}
          </div>
        )}

        {outputType === "presentation" && (
          <div className="mt-3 space-y-2 text-sm">
            {((r.slides as Array<{ title: string; bullets: string[] }> | undefined) ?? []).map((s, i) => (
              <div key={i} className="rounded-md border border-current/10 p-3"><div className="font-medium">{i + 1}. {s.title}</div><ul className="list-disc pl-5">{s.bullets.map((b) => <li key={b}>{b}</li>)}</ul></div>
            ))}
            {(result.presentationDeck as { downloadUrl?: string; fileBase64?: string; fileName?: string; mode?: string } | undefined)?.downloadUrl ? (
              <a href={(result.presentationDeck as { downloadUrl: string }).downloadUrl} target="_blank" className="inline-flex items-center gap-1 text-sm underline"><ExternalLink className="size-3" /> Download deck</a>
            ) : (result.presentationDeck as { fileBase64?: string; fileName?: string } | undefined)?.fileBase64 ? (
              <a href={`data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,${(result.presentationDeck as { fileBase64: string }).fileBase64}`} download={(result.presentationDeck as { fileName: string }).fileName} className="inline-flex items-center gap-1 text-sm underline">Download {String((result.presentationDeck as { fileName: string }).fileName)}</a>
            ) : (
              <div className="rounded-md border border-dashed p-3 text-xs opacity-60">Deck: {(result.presentationDeck as { mode?: string })?.mode === "presenton" ? "presenton" : "demo – add PRESENTON_API_URL for live pptx (slides JSON shown above)"}</div>
            )}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mt-4 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5">
            <div className="font-medium">Warnings</div><ul className="list-disc pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          </div>
        )}
        {attribution && <div className="mt-2 text-xs opacity-60">Attribution: {attribution}</div>}
        {claimSupport && claimSupport.length > 0 && (
          <details className="mt-2 text-xs"><summary className="cursor-pointer opacity-70">Claim support ({claimSupport.length}) – govt advisory audit</summary>
            <ul className="mt-2 space-y-1">{claimSupport.map((c, i) => (
              <li key={i} className={`${c.flagIfWeak ? "text-amber-700" : ""}`}>{c.claim} — {c.supported ? "supported" : "NOT supported"} {c.flagIfWeak ? "⚑ weak" : ""} <span className="opacity-60">[{c.sourceEvidence.slice(0, 80)}…]</span></li>
            ))}</ul>
          </details>
        )}
        <details className="mt-3 text-xs opacity-60"><summary>Raw enrichedSource / pipeline debug</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-current/5 p-2 text-[11px]">{JSON.stringify({ enrichedSource: result.enrichedSource, visionDescriptions: result.visionDescriptions, videoTranscript: result.videoTranscript, keyframeDescriptions: result.keyframeDescriptions }, null, 2)}</pre></details>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
