"use client";
import { useState } from "react";
import type { Artefact } from "@/lib/types";
export function ArtefactPreview({ artefacts }: { artefacts: Artefact[] }) {
  const [active, setActive] = useState(0);
  const a = artefacts[active];
  if (!artefacts.length) return null;
  return (
    <div className="rounded-lg border border-current/10 p-4">
      <div className="flex flex-wrap gap-2">{artefacts.map((art,i)=><button key={art.type} onClick={()=>setActive(i)} className={`rounded px-3 py-2 text-sm border ${i===active?"bg-current/10":""}`}>{art.type}</button>)}</div>
      {a ? <div className="mt-4"><h4 className="font-semibold">{a.title}</h4><pre className="mt-2 whitespace-pre-wrap rounded bg-current/5 p-3 text-sm">{a.body}</pre>{a.warnings.length? <p className="mt-2 text-xs opacity-60">Warnings: {a.warnings.join("; ")}</p>:null}<p className="mt-1 text-xs opacity-60">Confidence {a.confidence}%</p></div>:null}
    </div>
  );
}
