"use client";
import type { OutputType } from "@/lib/types";
const all: OutputType[] = ["Video","LinkedIn","Twitter","Advisory","Infographic","ExecutiveSummary","Presentation"];
export function OutputSelector({ selected, onChange }: { selected: OutputType[]; onChange: (v: OutputType[])=>void }) {
  const toggle = (o: OutputType) => onChange(selected.includes(o) ? selected.filter((x)=>x!==o) : [...selected, o]);
  return (
    <div className="rounded-lg border border-current/10 p-4">
      <h3 className="font-semibold">Output Selector (≥1 required)</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {all.map((o)=><label key={o} className="flex items-center gap-2 rounded border px-3 py-2 text-sm cursor-pointer"><input type="checkbox" checked={selected.includes(o)} onChange={()=>toggle(o)} />{o}</label>)}
      </div>
    </div>
  );
}
