import { memo } from "react";
import { Save, X } from "lucide-react";
import Images from "../assets";
import Button from "../components/ui/Button";
import { IBMPlexSans400, IBMPlexSans600, IBMPlexSans700 } from "../components/ui/Text";

interface EditorTopBarProps {
  title?: string;
  editable: boolean;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}

/** The full editor's app bar — pinned above the toolbar, never scrolls. App logo + "DMS EDITOR"
 * on the left (Google-Docs-style: product mark, then the document's own name), Save / Close on
 * the right. */
function EditorTopBar({ title, editable, saving, onSave, onClose }: EditorTopBarProps) {
  return (
    <header className="flex items-center gap-4 h-14 px-4 bg-surface-100 shadow-neu-header shrink-0 z-20">
      {/* Inline size on purpose: the library stylesheet (imported by FullPageEditor) is UNLAYERED and
          carries a preflight (`img { height: auto }`), which beats Tailwind's layered h-8/w-auto. */}
      <img src={Images.logo} alt="DMS" style={{ height: 32, width: "auto" }} className="object-contain shrink-0" />
      <div className="h-7 w-px bg-surface-200 shrink-0" />
      <div className="min-w-0 leading-tight">
        <IBMPlexSans700 as="p" className="text-sm tracking-wider text-primary-600">
          DMS EDITOR
        </IBMPlexSans700>
        <IBMPlexSans400 as="p" className="text-xs text-gray-500 truncate">
          {title || "Document"}
        </IBMPlexSans400>
      </div>

      <div className="ml-auto flex items-center gap-2 shrink-0">
        {!editable && (
          <IBMPlexSans600 as="span" className="text-xs text-gray-500 px-2.5 py-1 rounded-full shadow-neu-pressed-sm">
            Read-only
          </IBMPlexSans600>
        )}
        {editable && (
          <Button size="sm" onClick={onSave} loading={saving}>
            <Save className="w-4 h-4" />
            Save
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close editor">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}

export default memo(EditorTopBar);
