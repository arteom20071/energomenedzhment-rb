import { X } from "lucide-react";
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
} from "react";

import { IconButton } from "./IconButton";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  triggerRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (element) => !element.hasAttribute("disabled") && element.tabIndex !== -1,
  );
}

export function Dialog({ title, open, onClose, triggerRef, children }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const focusInitial = () => {
      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusables = getFocusableElements(dialog);
      (focusables[0] ?? dialog).focus();
    };

    focusInitial();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusables = getFocusableElements(dialog);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      event.preventDefault();

      const activeIndex = focusables.indexOf(document.activeElement as HTMLElement);
      const nextIndex = event.shiftKey
        ? (activeIndex - 1 + focusables.length) % focusables.length
        : (activeIndex + 1) % focusables.length;

      focusables[nextIndex]?.focus();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      return;
    }

    const restoreTarget = triggerRef?.current ?? previouslyFocusedRef.current;
    restoreTarget?.focus();
  }, [open, triggerRef]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
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
