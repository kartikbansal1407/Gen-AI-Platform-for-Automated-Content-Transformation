"use client";
import type { TransformControls } from "@/lib/types";
export function ControlsPanel({ controls, setControls }: { controls: TransformControls; setControls: (c: TransformControls)=>void }) {
  const update = (k: keyof TransformControls, v: string) => setControls({ ...controls, [k]: v });
  return (
    <div className="rounded-lg border border-current/10 p-4">
      <h3 className="font-semibold">Operator Controls</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="text-sm">Audience<input value={controls.audience} onChange={(e)=>update("audience", e.target.value)} className="mt-1 w-full rounded border p-2 text-sm bg-transparent" /></label>
        <label className="text-sm">Tone<select value={controls.tone} onChange={(e)=>update("tone", e.target.value)} className="mt-1 w-full rounded border p-2 text-sm bg-transparent"><option>Analytical</option><option>Conversational</option><option>Formal</option><option>Persuasive</option><option>Advisory</option><option>Playful</option></select></label>
        <label className="text-sm">Language<select value={controls.language} onChange={(e)=>update("language", e.target.value)} className="mt-1 w-full rounded border p-2 text-sm bg-transparent"><option>English</option><option>Hindi</option><option>Hinglish</option></select></label>
        <label className="text-sm">Detail<select value={controls.detail} onChange={(e)=>update("detail", e.target.value)} className="mt-1 w-full rounded border p-2 text-sm bg-transparent"><option>Brief</option><option>Standard</option><option>Detailed</option></select></label>
        <label className="text-sm">Objective<input value={controls.objective} onChange={(e)=>update("objective", e.target.value)} className="mt-1 w-full rounded border p-2 text-sm bg-transparent" /></label>
        <label className="text-sm">Style<select value={controls.style} onChange={(e)=>update("style", e.target.value)} className="mt-1 w-full rounded border p-2 text-sm bg-transparent"><option>Professional</option><option>Journalistic</option><option>Technical</option><option>Narrative</option><option>Bullet-brief</option></select></label>
      </div>
    </div>
  );
}
