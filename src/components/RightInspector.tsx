import type { ReactNode } from "react";

import type { ElementAnimation, SlideTransition } from "../domain/presentation";

const transitionOptions: { value: SlideTransition; label: string }[] = [
  { value: "none", label: "Нет" },
  { value: "fade", label: "Затухание" },
  { value: "slide", label: "Сдвиг" },
  { value: "zoom", label: "Масштаб" },
];

const animationOptions: { value: ElementAnimation | ""; label: string }[] = [
  { value: "", label: "Нет" },
  { value: "fade-up", label: "Появление снизу" },
  { value: "scale", label: "Масштаб" },
  { value: "bounce", label: "Отскок" },
];

interface RightInspectorProps {
  hasSelection: boolean;
  transition: SlideTransition;
  animation?: ElementAnimation;
  selectedObjectPanel?: ReactNode;
  onTransitionChange?: (transition: SlideTransition) => void;
  onAnimationChange?: (animation: ElementAnimation | undefined) => void;
}

export function RightInspector({
  hasSelection,
  transition,
  animation,
  selectedObjectPanel,
  onTransitionChange,
  onAnimationChange,
}: RightInspectorProps) {
  return (
    <aside
      aria-label="Инспектор"
      className="flex w-72 shrink-0 flex-col border-l border-slate-800 bg-slate-900"
    >
      {hasSelection ? (
        <div className="flex-1 overflow-auto p-4">
          {selectedObjectPanel ?? (
            <p className="text-sm text-slate-400">
              Свойства выбранного объекта будут доступны здесь.
            </p>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Настройки слайда
          </h3>
          <div className="mt-4 space-y-4">
            <label className="block text-sm text-slate-300">
              <span className="mb-1 block text-xs text-slate-400">Переход слайда</span>
              <select
                aria-label="Переход слайда"
                value={transition}
                onChange={(event) =>
                  onTransitionChange?.(event.target.value as SlideTransition)
                }
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                {transitionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-300">
              <span className="mb-1 block text-xs text-slate-400">Анимация элементов</span>
              <select
                aria-label="Анимация элементов"
                value={animation ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  onAnimationChange?.(
                    value === "" ? undefined : (value as ElementAnimation),
                  );
                }}
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                {animationOptions.map((option) => (
                  <option key={option.value || "none"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
    </aside>
  );
}
