import type { SaveStatus } from "../store/editorStore";

const saveStatusLabels: Record<SaveStatus, string> = {
  idle: "Готово",
  dirty: "Есть изменения",
  saving: "Сохранение…",
  saved: "Сохранено",
  error: "Ошибка сохранения",
};

interface SaveStatusBadgeProps {
  status: SaveStatus;
}

export function SaveStatusBadge({ status }: SaveStatusBadgeProps) {
  return (
    <span
      aria-live="polite"
      className="text-xs text-slate-400"
      data-save-status={status}
    >
      {saveStatusLabels[status]}
    </span>
  );
}
