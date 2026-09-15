import { memo, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "danger" | "success" | "ghost";
type Size = "sm" | "md" | "lg";

/*
 * Neumorphic buttons: primary/danger/success are gradient-filled "raised" chips
 * (shadow-neu-raised-sm, matching the design's soft depth); secondary is a
 * surface-colored raised chip with colored text — the design's "soft" action
 * style (e.g. its "Request changes" button). ghost drops the shadow entirely
 * for a plain inline action. active: switches to the pressed shadow so a click
 * reads as physically pushing the surface in, not just a color change.
 */
const variants: Record<Variant, string> = {
  primary:
    "bg-linear-to-br from-primary-500 to-primary-700 text-white shadow-neu-raised-sm hover:brightness-105 active:shadow-neu-pressed-sm",
  secondary:
    "bg-surface-100 text-gray-700 shadow-neu-raised-sm hover:text-gray-900 active:shadow-neu-pressed-sm",
  danger:
    "bg-linear-to-br from-danger-500 to-danger-600 text-white shadow-neu-raised-sm hover:brightness-105 active:shadow-neu-pressed-sm",
  success:
    "bg-linear-to-br from-success-500 to-success-600 text-white shadow-neu-raised-sm hover:brightness-105 active:shadow-neu-pressed-sm",
  ghost: "bg-transparent hover:bg-surface-200 text-gray-600",
};
const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-2.5 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

function Button({
  children,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

export default memo(Button);
