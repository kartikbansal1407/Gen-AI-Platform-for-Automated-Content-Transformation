"use client";
export function IngestDropzone({ text, setText, url, setUrl }: { text: string; setText: (v: string)=>void; url: string; setUrl: (v: string)=>void }) {
  return (
    <div className="rounded-lg border border-current/10 p-4">
      <h3 className="font-semibold">Source Intake</h3>
      <textarea value={text} onChange={(e)=>setText(e.target.value)} className="mt-3 min-h-32 w-full rounded-md border border-current/10 bg-transparent p-3 text-sm" placeholder="Paste source text / prompt" />
      <input value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="URL (optional — will be fetched server-side)" className="mt-3 w-full rounded-md border border-current/10 bg-transparent p-2 text-sm" />
      <p className="mt-2 text-xs opacity-60">PDF/DOCX upload: parse via /api/transform docs[] field; drag-drop can be wired later.</p>
    </div>
  );
}
