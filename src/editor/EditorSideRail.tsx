import { memo, useCallback, useState, type ReactNode } from "react";
import { Braces, X } from "lucide-react";
import Tooltip from "../components/ui/Tooltip";
import { IBMPlexSans600 } from "../components/ui/Text";

interface EditorSideRailProps {
  /** Panel content, rendered while the panel is open — receives nothing; the caller binds any
   * editor-specific behavior (e.g. insert-at-cursor) before passing it. */
  fieldsPanel: ReactNode;
}

/**
 * Google-Docs-style right side: a slim, always-visible icon rail, and — when the rail's Fields
 * button is clicked — a panel that opens to its left, directly under the app bar. Both are
 * siblings of the scrolling canvas (not inside it), so they stay put while the page scrolls.
 * Closed by default; the scrollbar inside the panel is hidden (it still scrolls).
 */
function EditorSideRail({ fieldsPanel }: EditorSideRailProps) {
  const [open, setOpen] = useState(false);
  const handleToggle = useCallback(() => setOpen((v) => !v), []);
  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <aside className="flex shrink-0 min-h-0">
      {open && (
        <div className="w-80 flex flex-col min-h-0 bg-surface-100 shadow-neu-sidebar">
          <div className="flex items-center justify-between px-4 h-12 shrink-0">
            <IBMPlexSans600 as="h2" className="text-sm text-gray-800">
              Insert field
            </IBMPlexSans600>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close fields panel"
              className="p-1.5 rounded-lg text-gray-500 hover:shadow-neu-raised-sm transition-shadow cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-3 pb-4">{fieldsPanel}</div>
        </div>
      )}

      <div className="w-14 flex flex-col items-center gap-3 py-3 bg-surface-100 shadow-neu-sidebar">
        <Tooltip content={open ? "Hide fields" : "Insert field"} placement="left">
          <button
            type="button"
            onClick={handleToggle}
            aria-label={open ? "Hide fields panel" : "Show fields panel"}
            aria-pressed={open}
            className={`p-2.5 rounded-xl text-gray-600 transition-shadow cursor-pointer ${
              open ? "shadow-neu-pressed-sm text-primary-600" : "shadow-neu-raised-sm hover:shadow-neu-pressed-sm"
            }`}
          >
            <Braces className="w-5 h-5" />
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}

export default memo(EditorSideRail);
