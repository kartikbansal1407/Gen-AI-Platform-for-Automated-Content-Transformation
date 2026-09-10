"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../hooks/use-theme";
import {
  LayoutDashboard,
  Plus,
  Files,
  PanelsTopLeft,
  ListChecks,
  History,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Orbit,
  Sparkles,
  X,
} from "lucide-react";
import { productSections, type ProductSection } from "@/lib/product";
import { useJobs } from "../hooks/use-jobs";
import { TransformDashboard } from "./transform-dashboard";
import {
  DashboardView,
  DocumentsView,
  WorkspaceView,
  ReviewQueueView,
  AnalyticsView,
  SettingsView,
} from "./product-views";

const icons = {
  dashboard: LayoutDashboard,
  transform: Plus,
  documents: Files,
  workspace: PanelsTopLeft,
  review: ListChecks,
  history: History,
  analytics: BarChart3,
  settings: Settings,
};

export function ContentForgeApp({ section }: { section: ProductSection }) {
  const data = useJobs();
  const [menu, setMenu] = useState(false);
  const { theme, setTheme: changeTheme } = useTheme();
  const router = useRouter();
  const [sessionError, setSessionError] = useState("");
  const current = productSections.find((item) => item.id === section);

  async function signOut() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error();
      router.replace("/login");
      router.refresh();
    } catch {
      setSessionError("Unable to sign out. Try again.");
    }
  }

  return (
    <div className={`${theme === "dark" ? "dark" : ""} min-h-screen bg-[var(--background)] text-[var(--foreground)]`}>
      <aside
        className={`${menu ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-[var(--line)] bg-[var(--surface)] px-4 py-5 transition-transform duration-200 lg:translate-x-0`}
      >
        <div className="mb-7 flex items-center justify-between px-2">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMenu(false)}>
            <span className="grid size-10 place-items-center rounded-2xl bg-[#173f4f] text-[#d9ff72] dark:bg-[#d9ff72] dark:text-[#173f4f]">
              <Orbit aria-hidden className="size-5" />
            </span>
            <span>
              <span className="block text-[17px] font-semibold tracking-tight">Orbita</span>
              <span className="block text-[11px] font-medium uppercase tracking-[0.17em] text-[var(--muted)]">Content Forge</span>
            </span>
          </Link>
          <button aria-label="Close navigation" className="rounded-xl p-2 text-[var(--muted)] hover:bg-[var(--surface-muted)] lg:hidden" onClick={() => setMenu(false)}>
            <X className="size-5" />
          </button>
        </div>

        <Link
          href="/transform"
          onClick={() => setMenu(false)}
          className="mb-5 flex items-center justify-between rounded-2xl bg-[#173f4f] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f303d] dark:bg-[#d9ff72] dark:text-[#10232b] dark:hover:bg-[#efffb9]"
        >
          <span className="flex items-center gap-2.5"><Sparkles className="size-4" />New Transformation</span>
          <span className="text-lg leading-none">+</span>
        </Link>

        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Workspace</p>
        <nav aria-label="Main navigation" className="space-y-1">
          {productSections.map(({ id, label }) => {
            const Icon = icons[id];
            const active = section === id;
            return (
              <Link
                key={id}
                href={`/${id}`}
                onClick={() => setMenu(false)}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-[var(--surface-muted)] font-semibold text-[var(--foreground)]" : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"}`}
              >
                <Icon aria-hidden className={`size-[17px] ${active ? "text-[#173f4f] dark:text-[#d9ff72]" : ""}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-[var(--line)] bg-[var(--background)] p-3.5">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium">
            <span className="size-2 rounded-full bg-emerald-500" />
            Operator workspace
          </div>
          <p className="mb-3 text-[11px] leading-5 text-[var(--muted)]">Source-faithful generation. Human approval stays in the loop.</p>
          <button onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]">
            <LogOut aria-hidden className="size-4" />Sign out
          </button>
        </div>
      </aside>

      {menu && <button aria-label="Close navigation overlay" onClick={() => setMenu(false)} className="fixed inset-0 z-40 bg-[#081014]/45 backdrop-blur-[2px] lg:hidden" />}

      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[var(--line)] bg-[color:var(--background)]/90 px-5 backdrop-blur-xl lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button aria-label="Open navigation" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 lg:hidden" onClick={() => setMenu(true)}>
              <Menu className="size-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{current?.label}</p>
              <p className="hidden truncate text-xs text-[var(--muted)] sm:block">{current?.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--muted)] sm:inline-flex">Private workspace</span>
            <span className="grid size-9 place-items-center rounded-full bg-[#173f4f] text-xs font-bold text-white dark:bg-[#d9ff72] dark:text-[#173f4f]">O</span>
          </div>
        </header>

        <main className="mx-auto max-w-[1480px] p-4 sm:p-6 lg:p-8">
          {(sessionError || data.error) && (
            <div role="alert" className="mb-5 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              {sessionError || data.error}
            </div>
          )}

          {section === "transform" ? (
            <TransformDashboard />
          ) : (
            <div className="space-y-6">
              <section className="flex flex-col gap-3 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Orbita workspace</p>
                  <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-[36px]">{current?.label}</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{current?.description}</p>
                </div>
                {section !== "dashboard" && section !== "settings" && (
                  <Link href="/transform" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173f4f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f303d] dark:bg-[#d9ff72] dark:text-[#173f4f]">
                    <Plus className="size-4" />New Transformation
                  </Link>
                )}
              </section>

              {data.loading ? (
                <div role="status" className="grid min-h-[280px] place-items-center rounded-3xl border border-dashed border-[var(--line)] bg-[var(--surface)]">
                  <div className="text-center"><Orbit className="mx-auto mb-3 size-6 animate-spin text-[var(--muted)]" /><p className="text-sm text-[var(--muted)]">Loading workspace…</p></div>
                </div>
              ) : (
                <>
                  {section === "dashboard" && <DashboardView jobs={data.jobs} />}
                  {section === "documents" && <DocumentsView jobs={data.jobs} />}
                  {(section === "workspace" || section === "history") && (
                    <WorkspaceView key={section} jobs={data.jobs} history={section === "history"} onUpdate={data.update} onRemove={data.remove} />
                  )}
                  {section === "review" && <ReviewQueueView jobs={data.jobs} onReview={data.review} />}
                  {section === "analytics" && <AnalyticsView jobs={data.jobs} />}
                  {section === "settings" && <SettingsView jobs={data.jobs} theme={theme} setTheme={changeTheme} />}
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
