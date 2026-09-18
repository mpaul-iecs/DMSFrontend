import { memo, type MouseEvent } from "react";
import type { LucideIcon } from "lucide-react";

interface ToolbarButtonProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

// Preventing the toolbar button's own mousedown is what stops a click from stealing
// ProseMirror's selection before onClick runs — without this, every toolbar action would
// first collapse/move the editor's selection to wherever the button sits in the DOM.
const preventMouseDown = (e: MouseEvent<HTMLButtonElement>) => e.preventDefault();

/** Base toolbar primitive — reuses SectionHtmlEditor's existing icon-chip pattern
 * (hover:shadow-neu-raised-sm) and adds the neumorphic "active = pressed" convention
 * already used for the sidebar's active nav link. */
function ToolbarButton({ icon: Icon, label, active = false, disabled = false, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={preventMouseDown}
      onClick={onClick}
      className={`p-1.5 rounded-lg text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-shadow ${
        active ? "shadow-neu-pressed-sm text-primary-600" : "hover:shadow-neu-raised-sm"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

export default memo(ToolbarButton);
