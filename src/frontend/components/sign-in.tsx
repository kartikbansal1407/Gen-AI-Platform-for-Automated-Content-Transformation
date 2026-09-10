"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, LockKeyhole, Orbit, ShieldCheck, Sparkles } from "lucide-react";

export function SignIn({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <main className="min-h-screen bg-[#eef2f3] p-3 text-[#14212b] sm:p-5 lg:p-7">
      <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-[1480px] overflow-hidden rounded-[30px] border border-[#dfe5e8] bg-white shadow-[0_24px_80px_rgba(15,48,61,0.08)] lg:min-h-[calc(100vh-56px)] lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative flex min-h-[420px] flex-col justify-between overflow-hidden bg-[#173f4f] p-7 text-white sm:p-10 lg:p-14">
          <div className="absolute -right-32 -top-32 size-[420px] rounded-full border border-white/10" />
          <div className="absolute -right-12 top-4 size-[280px] rounded-full border border-white/10" />
          <div className="relative flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#d9ff72] text-[#173f4f]"><Orbit className="size-6" /></span>
            <div><p className="text-lg font-semibold tracking-tight">Orbita</p><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">Content Forge</p></div>
          </div>

          <div className="relative my-12 max-w-2xl">
            <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d9ff72]"><Sparkles className="size-4" />Operator-controlled AI</p>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-5xl lg:text-6xl">One source. Every useful format. Still under your control.</h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-white/70 sm:text-base">Orbita turns documents, links and media into reviewable communication deliverables without hiding the source, evidence or approval step.</p>
          </div>

          <div className="relative grid gap-3 sm:grid-cols-3">
            {["Source-faithful", "Human-reviewed", "Private workspace"].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5 text-xs text-white/75"><CheckCircle2 className="size-4 text-[#d9ff72]" />{item}</div>)}
          </div>
        </section>

        <section className="flex items-center justify-center p-7 sm:p-10 lg:p-14">
          <div className="w-full max-w-[430px]">
            <div className="mb-8 flex size-12 items-center justify-center rounded-2xl bg-[#edf2f3] text-[#173f4f]"><LockKeyhole className="size-5" /></div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#73848d]">Secure workspace</p>
            <h2 className="text-3xl font-semibold tracking-[-0.035em]">Welcome back.</h2>
            <p className="mt-3 text-sm leading-6 text-[#667681]">Enter your operator access code to open Orbita.</p>

            <form className="mt-8 space-y-5" onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError("");
              try {
                const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessCode: code }) });
                if (!response.ok) throw new Error();
                router.replace("/dashboard");
                router.refresh();
              } catch {
                setError("The access code was not accepted. Check your code and try again.");
              } finally {
                setBusy(false);
              }
            }}>
              <div>
                <label className="mb-2 block text-sm font-semibold" htmlFor="access-code">Operator access code</label>
                <input id="access-code" type="password" autoComplete="current-password" autoFocus required maxLength={200} value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter access code" className="h-12 w-full rounded-xl border border-[#d9e1e4] bg-[#f8fafb] px-4 text-sm outline-none transition focus:border-[#7895a1] focus:ring-4 focus:ring-[#173f4f]/[0.06]" />
              </div>
              <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173f4f] px-4 text-sm font-semibold text-white transition hover:bg-[#0f303d] disabled:opacity-50">{busy ? "Signing in…" : "Open workspace"}<ArrowRight className="size-4" /></button>
              {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            </form>

            {demo && <p className="mt-5 rounded-xl border border-[#dde5e8] bg-[#f7f9fa] p-3 text-xs leading-5 text-[#667681]">Local demo mode is active. Enter any non-empty access code. Transformations stay in this browser unless database storage is configured.</p>}
            <div className="mt-8 flex items-center gap-2 text-xs text-[#73848d]"><ShieldCheck className="size-4" />Signed session · no automatic publishing</div>
          </div>
        </section>
      </div>
    </main>
  );
}
