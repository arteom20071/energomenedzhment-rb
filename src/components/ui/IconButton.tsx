import { X } from "lucide-react";
import type { ReactNode } from "react";

interface IconButtonProps {
  label: string;
  tooltip?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

export function IconButton({
  label,
  tooltip,
  onClick,
  disabled = false,
  children,
  className = "",
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={tooltip ?? label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md p-2 text-slate-300 transition hover:bg-slate-800 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

interface DialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Dialog({ title, open, onClose, children }: DialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <IconButton label="Закрыть" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
