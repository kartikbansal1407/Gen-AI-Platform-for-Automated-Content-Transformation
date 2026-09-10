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
  tone: [
    "analytical",
    "formal",
    "conversational",
    "narrative",
    "assertive",
    "persuasive",
    "advisory",
    "playful",
  ],
  language: [
    "English",
    "Hindi",
    "Hinglish",
    "Bilingual EN/HI",
    "Tamil",
    "Bengali",
  ],
  detailLevel: ["brief", "standard", "detailed"],
  objective: ["Inform", "Persuade", "Alert", "Mobilize", "Brief"],
  style: [
    "professional",
    "journalistic",
    "technical",
    "narrative",
    "bullet-brief",
    "analytical",
    "bullet-point",
    "persuasive",
  ],
};
export function ControlsPanel({
  controls,
  setControls,
}: {
  controls: OperatorControls;
  setControls: (controls: OperatorControls) => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Operator controls</h2>
      <label className="block text-sm">
        Audience
        <input
          list="audiences"
          value={controls.audience}
          onChange={(e) =>
            setControls({ ...controls, audience: e.target.value })
          }
          className="mt-1 h-9 w-full rounded-md border border-current/20 bg-transparent px-2"
        />
      </label>
      <datalist id="audiences">
        <option>NTRO analysts</option>
        <option>Young policy researchers</option>
        <option>General public</option>
        <option>Executive leadership</option>
      </datalist>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(choices).map(([key, values]) => (
          <label className="block text-sm" key={key}>
            {key === "detailLevel"
              ? "Detail level"
              : key[0].toUpperCase() + key.slice(1)}
            <select
              value={String(controls[key as keyof OperatorControls])}
              onChange={(e) =>
                setControls({ ...controls, [key]: e.target.value })
              }
              className="mt-1 h-9 w-full rounded-md border border-current/20 bg-transparent px-2"
            >
              {values.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={controls.translateSource ?? false}
          onChange={(e) =>
            setControls({ ...controls, translateSource: e.target.checked })
          }
        />
        Translate source quotations into the output language
      </label>
      <label className="block text-sm">
        Video duration
        <select
          value={controls.videoDuration ?? 60}
          onChange={(e) =>
            setControls({
              ...controls,
              videoDuration: Number(e.target.value) as 30 | 60 | 90,
            })
          }
          className="ml-3 rounded border border-current/20 bg-transparent p-1"
        >
          {[30, 60, 90].map((v) => (
            <option key={v} value={v}>
              {v} seconds
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
