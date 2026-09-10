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
  FileText,
  LogOut,
  Menu,
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
  return (
    <div
      className={`${theme === "dark" ? "dark bg-[#0e161e] text-slate-100" : "bg-[#f5f6f8] text-[#17232e]"} min-h-screen`}
    >
      <aside
        className={`${menu ? "block" : "hidden"} fixed inset-y-0 left-0 z-40 w-60 border-r border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#14212b] lg:block`}
      >
        <Link
          href="/dashboard"
          className="mb-10 flex items-center gap-3 text-lg font-semibold"
          onClick={() => setMenu(false)}
        >
          <FileText aria-hidden className="size-7" />
          Content Forge
        </Link>
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Operator workspace
        </p>
        <nav aria-label="Main navigation" className="space-y-1">
          {productSections.map(({ id, label }) => {
            const Icon = icons[id];
            return (
              <Link
                key={id}
                href={`/${id}`}
                onClick={() => setMenu(false)}
                aria-current={section === id ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm ${section === id ? "bg-slate-100 font-semibold dark:bg-slate-700" : "text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}
              >
                <Icon aria-hidden className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-5 bottom-6 border-t border-slate-200 pt-5 dark:border-slate-700">
          <p className="mb-4 text-xs text-slate-400">
            SIH 26154 · Content operations
          </p>
          <button
            className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300"
            onClick={async () => {
              try {
                const res = await fetch("/api/auth/logout", { method: "POST" });
                if (!res.ok) throw new Error();
                router.replace("/login");
                router.refresh();
              } catch {
                setSessionError("Unable to sign out. Try again.");
              }
            }}
          >
            <LogOut aria-hidden className="size-4" />
            Sign out
          </button>
        </div>
      </aside>
      {menu && (
        <button
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        />
      )}
      <div className="lg:pl-60">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 dark:border-slate-700 dark:bg-[#14212b] lg:px-9">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open navigation"
              className="lg:hidden"
              onClick={() => setMenu(true)}
            >
              <Menu className="size-5" />
            </button>
            <span className="text-sm text-slate-500 dark:text-slate-300">
              Content operations /{" "}
              {productSections.find((s) => s.id === section)?.label}
            </span>
          </div>
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs dark:border-slate-600">
            Operator
          </span>
        </header>
        <main className="mx-auto max-w-[1500px] space-y-6 p-5 lg:p-9">
          {sessionError && <p role="alert">{sessionError}</p>}
          {data.error && (
            <p
              role="alert"
              className="rounded-lg border border-amber-300 p-3 text-sm"
            >
              {data.error}
            </p>
          )}
          {section === "transform" ? (
            <TransformDashboard />
          ) : (
            <>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                  Content Forge
                </p>
                <h1 className="text-3xl font-semibold tracking-tight">
                  {productSections.find((s) => s.id === section)?.label}
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                  {productSections.find((s) => s.id === section)?.description}
                </p>
              </div>
              {data.loading ? (
                <p role="status" className="py-10 text-sm text-slate-500">
                  Loading workspace…
                </p>
              ) : (
                <>
                  {section === "dashboard" && (
                    <DashboardView jobs={data.jobs} />
                  )}
                  {section === "documents" && (
                    <DocumentsView jobs={data.jobs} />
                  )}
                  {(section === "workspace" || section === "history") && (
                    <WorkspaceView
                      key={section}
                      jobs={data.jobs}
                      history={section === "history"}
                      onUpdate={data.update}
                      onRemove={data.remove}
                    />
                  )}
                  {section === "review" && (
                    <ReviewQueueView jobs={data.jobs} onReview={data.review} />
                  )}
                  {section === "analytics" && (
                    <AnalyticsView jobs={data.jobs} />
                  )}
                  {section === "settings" && (
                    <SettingsView
                      jobs={data.jobs}
                      theme={theme}
                      setTheme={changeTheme}
                    />
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
