import { memo, useEffect, useMemo, useState } from "react";
import { FieldPanel } from "../../editor";
import fieldService from "../../services/fieldService";
import { wrapPlaceholder } from "../../utilities/placeholder";
import type { TemplateFieldDto, TemplatePlaceholderFormat } from "../../types/template";

interface TemplateFieldPanelProps {
  templateVersionId: number;
  placeholderFormat: TemplatePlaceholderFormat;
  onInsert: (token: string) => void;
  disabled?: boolean;
  bare?: boolean;
}

/** Template-domain adapter around the generic `FieldPanel` — fetches this template
 * version's fields and maps them to `{label, token}` via `wrapPlaceholder`. Kept out of
 * `src/editor/` (the reusable engine) since it's template-specific wiring, not part of
 * what a future document-editing context would reuse. */
function TemplateFieldPanel({ templateVersionId, placeholderFormat, onInsert, disabled, bare }: TemplateFieldPanelProps) {
  const [fields, setFields] = useState<TemplateFieldDto[]>([]);

  useEffect(() => {
    let cancelled = false;
    fieldService
      .list({ templateVersionId })
      .then((res) => {
        if (!cancelled) setFields(res.data.responseData ?? []);
      })
      .catch(() => {
        // Non-critical — the panel just stays empty, everything else keeps working.
      });
    return () => {
      cancelled = true;
    };
  }, [templateVersionId]);

  const insertableFields = useMemo(
    () =>
      fields
        .slice()
        .sort((a, b) => a.fieldOrder - b.fieldOrder)
        .map((f) => ({ label: f.fieldLabel, token: wrapPlaceholder(f.fieldKey, placeholderFormat) })),
    [fields, placeholderFormat],
  );

  return <FieldPanel fields={insertableFields} onInsert={onInsert} disabled={disabled} bare={bare} />;
}

export default memo(TemplateFieldPanel);
