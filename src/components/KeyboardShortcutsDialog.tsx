import { Dialog } from "./ui/IconButton";

const shortcuts = [
  { keys: "Ctrl/Cmd + Z", action: "Отменить" },
  { keys: "Ctrl/Cmd + Shift + Z", action: "Повторить" },
  { keys: "Ctrl/Cmd + D", action: "Дублировать выделение" },
  { keys: "Delete / Backspace", action: "Удалить выделение" },
  { keys: "F5", action: "Показать презентацию" },
  { keys: "?", action: "Горячие клавиши" },
] as const;

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsDialog({ open, onClose }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog title="Горячие клавиши" open={open} onClose={onClose}>
      <ul className="space-y-2 text-sm text-slate-300">
        {shortcuts.map(({ keys, action }) => (
          <li key={keys} className="flex items-center justify-between gap-4">
            <span>{action}</span>
            <kbd className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200">
              {keys}
            </kbd>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}
