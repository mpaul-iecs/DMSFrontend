import { forwardRef, type InputHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { IBMPlexSans400 } from "./Text";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

/**
 * Custom-styled checkbox. Keeps a real `<input type="checkbox">` (sr-only) driving
 * everything via Tailwind's peer-* states, so it stays fully accessible/keyboard-operable
 * and works as a drop-in for react-hook-form's register()/Controller — only the visible
 * box is custom.
 */
const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className = "", id, ...props },
  ref,
) {
  const inputId = id || props.name;
  return (
    <label htmlFor={inputId} className={`inline-flex items-center gap-2.5 cursor-pointer select-none group ${className}`}>
      <span className="relative inline-flex shrink-0">
        <input ref={ref} id={inputId} type="checkbox" className="peer sr-only" {...props} />
        <span
          className="w-5 h-5 rounded-md border-2 border-gray-300 bg-white transition-all duration-150
            peer-checked:border-primary-500 peer-checked:bg-primary-500
            peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/30 peer-focus-visible:ring-offset-1
            group-hover:border-gray-400 peer-checked:group-hover:border-primary-600 peer-checked:group-hover:bg-primary-600
            peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"
        />
        <Check
          strokeWidth={3}
          className="absolute inset-0 m-auto w-3.5 h-3.5 text-white opacity-0 scale-50 transition-all duration-150 peer-checked:opacity-100 peer-checked:scale-100 pointer-events-none"
        />
      </span>
      {label && (
        <IBMPlexSans400 className="text-sm text-gray-700 peer-disabled:opacity-50">{label}</IBMPlexSans400>
      )}
    </label>
  );
});

export default Checkbox;
