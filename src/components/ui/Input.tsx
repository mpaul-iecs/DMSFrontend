import { forwardRef, memo, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/*
 * Neumorphic "pressed" field: no border, bg matches the page surface, and the
 * recessed look comes entirely from shadow-neu-pressed (see index.css). Error/
 * focus states layer an additional ring on top — shadow-neu-pressed sets
 * Tailwind's --tw-shadow-* var and ring-* sets --tw-ring-shadow-*, and both
 * compose into one box-shadow, so neither clobbers the other.
 */
const Input = memo(
  forwardRef<HTMLInputElement, InputProps>(({ label, error, id, className = "", ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3.5 py-2.5 rounded-xl border-none bg-surface-100 text-sm text-gray-900 placeholder:text-gray-400 shadow-neu-pressed focus:outline-none focus:ring-2 transition-shadow ${
            error ? "ring-2 ring-danger-500/30 focus:ring-danger-500/40" : "focus:ring-primary-500/40"
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      </div>
    );
  }),
);

Input.displayName = "Input";

export default Input;
