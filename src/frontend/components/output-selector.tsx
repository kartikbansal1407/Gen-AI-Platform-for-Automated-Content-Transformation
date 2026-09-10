"use client";

import {
  Check,
  ClipboardList,
  FileText,
  FileWarning,
  Film,
  ImageIcon,
  Megaphone,
  Presentation,
} from "lucide-react";
import type { OutputType } from "@/agent/transform-types";

type Option = {
  id: OutputType;
  label: string;
  desc: string;
  icon: typeof FileText;
};

const outputOptions: Array<Option> = [
  { id: "advisory", label: "Advisory", desc: "Structured recommendation", icon: FileWarning },
  { id: "infographic", label: "Infographic", desc: "Visual content layout", icon: ImageIcon },
  { id: "executive_summary", label: "Executive Summary", desc: "Condensed decision brief", icon: ClipboardList },
  { id: "video_package", label: "Video Package", desc: "Storyboard, narration, subtitles", icon: Film },
  { id: "presentation", label: "Presentation", desc: "Slides and speaker notes", icon: Presentation },
  { id: "linkedin_post", label: "LinkedIn Post", desc: "Professional publishing format", icon: Megaphone },
  { id: "twitter_post", label: "Twitter / X Post", desc: "Post or numbered thread", icon: Megaphone },
];

export function OutputSelector({
  selected,
  setSelected,
}: {
  selected: OutputType[];
  setSelected: (value: OutputType[]) => void;
}) {
  function toggle(id: OutputType) {
    if (selected.includes(id)) {
      if (selected.length === 1) return;
      setSelected(selected.filter((item) => item !== id));
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
        className={`group relative flex min-h-20 items-start gap-3 rounded-2xl border p-3.5 text-left transition ${active ? "border-[#173f4f] bg-[#173f4f]/[0.045] dark:border-[#d9ff72] dark:bg-[#d9ff72]/[0.06]" : "border-[var(--line)] bg-[var(--surface)] hover:border-[#9aadb5] hover:bg-[var(--background)]"}`}
      >
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${active ? "bg-[#173f4f] text-white dark:bg-[#d9ff72] dark:text-[#173f4f]" : "bg-[var(--surface-muted)] text-[var(--muted)]"}`}>
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 pr-5">
          <span className="block text-sm font-semibold">{label}</span>
          <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{desc}</span>
        </span>
        <span className={`absolute right-3 top-3 grid size-5 place-items-center rounded-full border ${active ? "border-[#173f4f] bg-[#173f4f] text-white dark:border-[#d9ff72] dark:bg-[#d9ff72] dark:text-[#173f4f]" : "border-[var(--line)] text-transparent"}`}>
          <Check className="size-3" />
        </span>
      </button>
    );
  }

  const primary = outputOptions.filter((option) => !["linkedin_post", "twitter_post"].includes(option.id));
  const publishing = outputOptions.filter((option) => ["linkedin_post", "twitter_post"].includes(option.id));

  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div><h3 className="text-sm font-semibold">Choose deliverables</h3><p className="mt-1 text-xs text-[var(--muted)]">Pick one or more outputs from the same source.</p></div>
        <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">{selected.length} selected</span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">{primary.map(renderOption)}</div>
      <details className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--background)] p-4">
        <summary className="cursor-pointer text-sm font-semibold">Additional publishing formats</summary>
        <p className="mt-1 text-xs text-[var(--muted)]">Secondary formats for channels, not automatic publishing.</p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">{publishing.map(renderOption)}</div>
      </details>
    </div>
  );
}

export { outputOptions };
