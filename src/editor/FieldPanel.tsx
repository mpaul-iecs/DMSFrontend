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
        <ul className="space-y-1">
          {fields.map((field) => (
            <li key={field.token}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onInsert(field.token)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left hover:shadow-neu-raised-sm disabled:opacity-40 disabled:cursor-not-allowed transition-shadow"
              >
                <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
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
