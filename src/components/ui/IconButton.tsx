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
      className={`rounded-md p-2 text-slate-300 transition hover:bg-slate-800 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
});
