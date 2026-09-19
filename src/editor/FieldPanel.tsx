import { memo } from "react";
import { Hash } from "lucide-react";
import Card from "../components/ui/Card";
import { IBMPlexSans400, IBMPlexSans600 } from "../components/ui/Text";
import type { InsertableField } from "./core/types";

interface FieldPanelProps {
  fields: InsertableField[];
  onInsert: (token: string) => void;
  disabled?: boolean;
}

/**
 * Domain-agnostic field-insertion panel — pure UI, no knowledge of `TemplateFieldDto` or
 * `templateVersionId`. `components/template/TemplateFieldPanel.tsx` is the template-specific
 * adapter that fetches fields and wraps them into `{label, token}` before rendering this.
 * Kept generic so a future document-editing context could supply a different field source
 * (or omit this panel entirely) without needing a different component.
 */
function FieldPanel({ fields, onInsert, disabled = false }: FieldPanelProps) {
  return (
    <Card>
      <IBMPlexSans600 as="h2" className="text-sm text-gray-700 mb-3">
        Fields
      </IBMPlexSans600>
      {disabled && (
        <IBMPlexSans400 as="p" className="text-xs text-gray-400 mb-2">
          Click into a section to insert a field
        </IBMPlexSans400>
      )}
      {fields.length === 0 ? (
        <IBMPlexSans400 as="p" className="text-sm text-gray-400">
          No fields defined for this template yet
        </IBMPlexSans400>
      ) : (
        /* Scrolls once there are more than ~5 fields (5 rows x ~3.3rem + gaps). The padding is
            deliberate: the raised buttons' shadows would otherwise be clipped by overflow. */
        <ul className="space-y-2.5 max-h-84 overflow-y-auto overscroll-contain p-1.5 -m-1.5">
          {fields.map((field) => (
            <li key={field.token}>
              {/* Same neumorphic button treatment as the header's notification bell:
                  raised at rest, pressed-in on hover/click. */}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onInsert(field.token)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left shadow-neu-raised-sm hover:shadow-neu-pressed-sm active:shadow-neu-pressed-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-neu-raised-sm transition-shadow cursor-pointer"
              >
                <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="min-w-0">
                  <IBMPlexSans600 as="span" className="block text-sm text-gray-800 truncate">
                    {field.label}
                  </IBMPlexSans600>
                  <IBMPlexSans400 as="span" className="block text-xs text-gray-400 truncate">
                    {field.token}
                  </IBMPlexSans400>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default memo(FieldPanel);
