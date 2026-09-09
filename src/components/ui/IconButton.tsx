import { forwardRef, type ReactNode } from "react";

interface IconButtonProps {
  label: string;
  tooltip?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    tooltip,
    onClick,
    disabled = false,
    children,
    className = "",
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={tooltip ?? label}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-11 min-w-11 rounded-md p-2 text-slate-300 transition hover:bg-slate-800 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-8 sm:min-w-8 ${className}`}
    >
      {children}
    </button>
  );
});
