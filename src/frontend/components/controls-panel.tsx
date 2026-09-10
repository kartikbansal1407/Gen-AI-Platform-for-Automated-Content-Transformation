"use client";

import type { OperatorControls } from "@/agent/transform-types";

export const defaultControls: OperatorControls = {
  audience: "NTRO analysts",
  tone: "analytical",
  language: "English",
  detailLevel: "standard",
  objective: "Inform",
  style: "professional",
  translateSource: false,
  videoDuration: 60,
};

const choices = {
  tone: ["analytical", "formal", "conversational", "narrative", "assertive", "persuasive", "advisory", "playful"],
  language: ["English", "Hindi", "Hinglish", "Bilingual EN/HI", "Tamil", "Bengali"],
  detailLevel: ["brief", "standard", "detailed"],
  objective: ["Inform", "Persuade", "Alert", "Mobilize", "Brief"],
  style: ["professional", "journalistic", "technical", "narrative", "bullet-brief", "analytical", "bullet-point", "persuasive"],
};

const fieldClass = "orbita-input mt-2 h-11 w-full px-3 text-sm outline-none";

export function ControlsPanel({
  controls,
  setControls,
}: {
  controls: OperatorControls;
  setControls: (controls: OperatorControls) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-[var(--muted)] sm:col-span-2">
          Audience
          <input
            list="audiences"
            value={controls.audience}
            onChange={(event) => setControls({ ...controls, audience: event.target.value })}
            className={fieldClass}
            placeholder="Who is this for?"
          />
        </label>
        <datalist id="audiences">
          <option>NTRO analysts</option>
          <option>Young policy researchers</option>
          <option>General public</option>
          <option>Executive leadership</option>
        </datalist>

        {Object.entries(choices).map(([key, values]) => (
          <label className="block text-xs font-semibold text-[var(--muted)]" key={key}>
            {key === "detailLevel" ? "Detail level" : key[0].toUpperCase() + key.slice(1)}
            <select
              value={String(controls[key as keyof OperatorControls])}
              onChange={(event) => setControls({ ...controls, [key]: event.target.value })}
              className={fieldClass}
            >
              {values.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <label className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--background)] p-3.5 text-sm">
          <input
            type="checkbox"
            checked={controls.translateSource ?? false}
            onChange={(event) => setControls({ ...controls, translateSource: event.target.checked })}
            className="mt-0.5 size-4 accent-[#173f4f]"
          />
          <span>
            <span className="block font-semibold">Translate source quotations</span>
            <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">Use the chosen output language for quoted source material.</span>
          </span>
        </label>

        <label className="block text-xs font-semibold text-[var(--muted)]">
          Video duration
          <select
            value={controls.videoDuration ?? 60}
            onChange={(event) => setControls({ ...controls, videoDuration: Number(event.target.value) as 30 | 60 | 90 })}
            className="orbita-input mt-2 h-11 min-w-36 px-3 text-sm outline-none"
          >
            {[30, 60, 90].map((value) => <option key={value} value={value}>{value} seconds</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
