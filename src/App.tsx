import {
  ChevronDown,
  Download,
  FileUp,
  Play,
  Redo2,
  Undo2,
} from "lucide-react";

const toolbarActions = [
  { label: "Undo", icon: Undo2 },
  { label: "Redo", icon: Redo2 },
  { label: "Import", icon: FileUp },
  { label: "Export", icon: Download },
  { label: "Preview", icon: Play },
] as const;

export function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="hidden min-h-screen grid-rows-[3.5rem_1fr] lg:grid">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-lg bg-indigo-500 font-bold text-white"
            >
              P
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                Local Presentation Editor
              </p>
              <p className="text-xs text-slate-400">Task 1 scaffold</p>
            </div>
          </div>

          <nav aria-label="Editor actions" className="flex items-center gap-1">
            {toolbarActions.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                disabled
                className="rounded-md p-2 text-slate-500 disabled:cursor-not-allowed"
                title={`${label} is not implemented yet`}
              >
                <Icon aria-hidden="true" size={18} />
              </button>
            ))}
          </nav>
        </header>

        <div className="grid min-h-0 grid-cols-[15rem_1fr_18rem]">
          <aside
            aria-label="Slides"
            className="border-r border-slate-800 bg-slate-900 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Slides
            </p>
            <div className="mt-4 rounded-lg border border-indigo-500/70 bg-slate-800 p-2">
              <div className="aspect-video rounded bg-slate-700" />
              <p className="mt-2 text-xs text-slate-300">Editor placeholder</p>
            </div>
          </aside>

          <section
            aria-label="Canvas workspace"
            className="grid min-w-0 place-items-center overflow-auto bg-slate-950 p-8"
          >
            <div className="w-full max-w-5xl">
              <div className="aspect-video rounded-sm bg-white shadow-2xl shadow-black/40">
                <div className="flex h-full flex-col items-center justify-center px-16 text-center">
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
                    1920 × 1080 logical canvas
                  </span>
                  <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900">
                    Presentation editor scaffold
                  </h1>
                  <p className="mt-3 max-w-xl text-lg text-slate-600">
                    The editing canvas and migrated seed presentation will be
                    implemented in later plan tasks.
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>Slide 1 of 1</span>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1 rounded-md border border-slate-800 px-2 py-1 disabled:cursor-not-allowed"
                >
                  Fit
                  <ChevronDown aria-hidden="true" size={14} />
                </button>
              </div>
            </div>
          </section>

          <aside
            aria-label="Inspector"
            className="border-l border-slate-800 bg-slate-900 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Inspector
            </p>
            <div className="mt-4 rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">
              Select an element to edit its properties.
            </div>
          </aside>
        </div>
      </div>

      <section className="grid min-h-screen place-items-center p-8 text-center lg:hidden">
        <div>
          <h1 className="text-xl font-semibold">Desktop workspace required</h1>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            The presentation editor scaffold is designed for viewports at least
            1024 pixels wide.
          </p>
        </div>
      </section>
    </main>
  );
}
