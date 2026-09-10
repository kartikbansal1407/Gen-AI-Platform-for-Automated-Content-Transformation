"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ArrowRight, LockKeyhole } from "lucide-react";
export function SignIn({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="grid min-h-screen bg-[#f4f5f7] text-[#17232e] lg:grid-cols-2">
      <section className="flex flex-col justify-between bg-[#15232d] p-8 text-white lg:p-16">
        <div className="flex items-center gap-3 font-semibold">
          <FileText aria-hidden className="size-8" />
          Content Forge
        </div>
        <div className="my-14 max-w-lg">
          <p className="mb-5 text-xs uppercase tracking-[0.2em] text-slate-400">
            Content transformation workspace
          </p>
          <h1 className="text-4xl font-semibold leading-tight lg:text-5xl">
            From source information to clear communication.
          </h1>
          <p className="mt-6 leading-7 text-slate-300">
            Prepare documents, configure your deliverables and review every
            output in one workspace.
          </p>
        </div>
        <p className="text-xs text-slate-400">
          SIH 26154 · Operator-controlled content transformation
        </p>
      </section>
      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <LockKeyhole aria-hidden className="mb-6 size-7 text-slate-500" />
          <h2 className="text-2xl font-semibold">Sign in to Content Forge</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Use your operator access code to open the workspace.
          </p>
          <form
            className="mt-8 space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const res = await fetch("/api/auth/login", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ accessCode: code }),
                });
                if (!res.ok) throw new Error();
                router.replace("/dashboard");
                router.refresh();
              } catch {
                setError(
                  "The access code was not accepted. Check your code and try again.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="block text-sm font-medium" htmlFor="access-code">
              Operator access code
            </label>
            <input
              id="access-code"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              maxLength={200}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 outline-none focus:ring-2 focus:ring-slate-500"
            />
            <button
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#15232d] px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign in"}
              <ArrowRight aria-hidden className="size-4" />
            </button>
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
          </form>
          {demo && (
            <p className="mt-5 rounded-lg border border-slate-200 p-3 text-xs leading-5 text-slate-500">
              Local demo: enter any non-empty access code. Your transformations
              stay in this browser unless database storage is configured.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
