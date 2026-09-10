"use client";

import {
  FileText,
  Film,
  ImageIcon,
  Presentation,
  Megaphone,
  FileWarning,
  ClipboardList,
} from "lucide-react";
import type { OutputType } from "@/agent/transform-types";

type Option = {
  id: OutputType;
  label: string;
  desc: string;
  icon: typeof FileText;
};

const outputOptions: Array<Option> = [
  {
    id: "advisory",
    label: "Advisory",
    desc: "Structured advisory",
    icon: FileWarning,
  },
  {
    id: "infographic",
    label: "Infographic",
    desc: "Content and visual layout",
    icon: ImageIcon,
  },
  {
    id: "executive_summary",
    label: "Executive Summary",
    desc: "Condensed brief",
    icon: ClipboardList,
  },
  {
    id: "video_package",
    label: "Video Package",
    desc: "Storyboard, narration, subtitles",
    icon: Film,
  },
  {
    id: "presentation",
    label: "Presentation",
    desc: "Slides and speaker notes",
    icon: Presentation,
  },
  {
    id: "linkedin_post",
    label: "LinkedIn Post",
    desc: "Professional post",
    icon: Megaphone,
  },
  {
    id: "twitter_post",
    label: "Twitter / X Post",
    desc: "Tweet or numbered thread",
    icon: Megaphone,
  },
];

export function OutputSelector({
  selected,
  setSelected,
}: {
  selected: OutputType[];
  setSelected: (v: OutputType[]) => void;
}) {
  function toggle(id: OutputType) {
    if (selected.includes(id)) {
      // Must keep at least 1
      if (selected.length === 1) return;
      setSelected(selected.filter((s) => s !== id));
    } else {
      setSelected([...selected, id]);
    }
  }

  function renderOption({ id, label, desc, icon: Icon }: Option) {
    const active = selected.includes(id);
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={active}
        key={id}
        onClick={() => toggle(id)}
        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${active ? "bg-current/10 border-current/20" : "border-current/10 hover:bg-current/5"}`}
      >
        <Icon className="size-4 shrink-0" />
        <span>
          <span className="font-medium">{label}</span>
          <span className="block text-xs opacity-60">{desc}</span>
        </span>
      </button>
    );
  }

  return (
    <div>
      <h3 className="pt-2 text-sm font-semibold">
        Output types (multi-select, ≥1 required)
      </h3>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {outputOptions
          .filter(
            (option) => !["linkedin_post", "twitter_post"].includes(option.id),
          )
          .map(renderOption)}
      </div>
      <details className="mt-3 rounded-md border border-current/10 p-3">
        <summary className="text-sm cursor-pointer">
          Additional publishing formats
        </summary>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {outputOptions
            .filter((option) =>
              ["linkedin_post", "twitter_post"].includes(option.id),
            )
            .map(renderOption)}
        </div>
      </details>
      <div className="text-xs opacity-60 mt-2">
        {selected.length} selected. Every output uses the same source.
      </div>
    </div>
  );
}

export { outputOptions };
