import { forwardRef, memo, useCallback, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

/** Drop-in for Input.tsx when the field is a password — adds a show/hide eye toggle. */
const PasswordInput = memo(
  forwardRef<HTMLInputElement, PasswordInputProps>(({ label, error, id, className = "", ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const inputId = id || props.name;

    const toggleVisible = useCallback(() => setVisible((v) => !v), []);

    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border-none bg-surface-100 text-sm text-gray-900 placeholder:text-gray-400 shadow-neu-pressed focus:outline-none focus:ring-2 transition-shadow ${
              error ? "ring-2 ring-danger-500/30 focus:ring-danger-500/40" : "focus:ring-primary-500/40"
            } ${className}`}
            {...props}
          />
          <button
            type="button"
            onClick={toggleVisible}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      </div>
    );
  }),
);

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
