import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import Can from "../components/auth/Can";
import { IBMPlexSans400, IBMPlexSans600, IBMPlexSans700 } from "../components/ui/Text";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchTemplateTypesThunk } from "../store/template/templateThunks";
import templateService from "../services/templateService";
import fieldService from "../services/fieldService";
import toast from "../utilities/toast";
import type { TemplateDto, TemplateFieldDto, UpsertFieldRequestDto } from "../types/template";

/** menu:10727:* — standalone Field management (Template Governance's field-level submodule). */
const FIELD_MENU_ID = 10727;

const PLACEHOLDER_FORMAT_LABEL: Record<string, string> = {
  doubleCurly: "{{fieldKey}}",
  doubleSquare: "[[fieldKey]]",
  singleSquare: "[fieldKey]",
  singleCurly: "{fieldKey}",
  parentheses: "(fieldKey)",
};

interface TemplateTypeOption {
  value: number;
  label: string;
}

interface TemplateOption {
  value: number;
  label: string;
}

interface NewFieldFormState {
  fieldKey: string;
  fieldLabel: string;
}

const EMPTY_NEW_FIELD: NewFieldFormState = { fieldKey: "", fieldLabel: "" };

/**
 * A field is just a named placeholder token — pick a Template Type, then a Template (version),
 * then define FieldKeys for it (e.g. "NAME"). Each one wraps into the template's own configured
 * bracket format (shown read-only below) when inserted into a section's content from
 * TemplateBuilderForm.tsx's insert-placeholder dropdown. Deliberately NOT a data-collection form
 * field — no type/validation/default-value/options (that richer shape was built and removed the
 * same day, 2026-09-18, once it was clear the actual feature is this much narrower — see
 * CLAUDE.md's "Template governance" section).
 */
function FieldListPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { templateTypes, templateTypesLoading } = useAppSelector((s) => s.template);

  const [selectedType, setSelectedType] = useState<TemplateTypeOption | null>(null);
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);
  const [selectedTemplateMeta, setSelectedTemplateMeta] = useState<TemplateDto | null>(null);

  const [fields, setFields] = useState<TemplateFieldDto[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  const [newField, setNewField] = useState<NewFieldFormState>(EMPTY_NEW_FIELD);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    dispatch(fetchTemplateTypesThunk());
  }, [dispatch]);

  const templateTypeOptions: TemplateTypeOption[] = useMemo(
    () => templateTypes.map((t) => ({ value: t.id, label: t.typeName })),
    [templateTypes],
  );

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  const refetchFields = useCallback((templateVersionId: number) => {
    setFieldsLoading(true);
    fieldService
      .list({ templateVersionId })
      .then((res) => setFields(res.data.responseData ?? []))
      .catch(() => toast.error("Failed to load fields"))
      .finally(() => setFieldsLoading(false));
  }, []);

  const handleTypeChange = useCallback((opt: TemplateTypeOption | null) => {
    setSelectedType(opt);
    setSelectedTemplate(null);
    setSelectedTemplateMeta(null);
    setTemplateOptions([]);
    setFields([]);
  }, []);

  useEffect(() => {
    if (!selectedType) return;
    let cancelled = false;
    setTemplatesLoading(true);
    templateService
      .list({ templateTypeId: selectedType.value })
      .then((res) => {
        if (cancelled) return;
        const items = res.data.responseData ?? [];
        setTemplateOptions(items.map((t) => ({ value: t.id, label: `${t.templateName} · ${t.versionLabel}` })));
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load templates for this type");
      })
      .finally(() => {
        if (!cancelled) setTemplatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedType]);

  const handleTemplateChange = useCallback(
    (opt: TemplateOption | null) => {
      setSelectedTemplate(opt);
      setFields([]);
      if (!opt) {
        setSelectedTemplateMeta(null);
        return;
      }
      templateService
        .getById(opt.value)
        .then((res) => {
          if (res.data.responseData) setSelectedTemplateMeta(res.data.responseData);
        })
        .catch(() => toast.error("Failed to load template details"));
      refetchFields(opt.value);
    },
    [refetchFields],
  );

  const handleNewFieldKeyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setNewField((prev) => ({ ...prev, fieldKey: e.target.value })),
    [],
  );
  const handleNewFieldLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setNewField((prev) => ({ ...prev, fieldLabel: e.target.value })),
    [],
  );

  const handleCreateField = useCallback(async () => {
    if (!selectedTemplate) return;
    if (!newField.fieldKey.trim() || !newField.fieldLabel.trim()) {
      toast.error("Field key and label are required");
      return;
    }
    const nextOrder = fields.length ? Math.max(...fields.map((f) => f.fieldOrder)) + 1 : 0;
    const payload: UpsertFieldRequestDto = {
      id: null,
      templateVersionId: selectedTemplate.value,
      fieldKey: newField.fieldKey.trim(),
      fieldLabel: newField.fieldLabel.trim(),
      fieldOrder: nextOrder,
    };
    setCreating(true);
    try {
      await fieldService.create(payload);
      toast.success("Field created");
      setNewField(EMPTY_NEW_FIELD);
      refetchFields(selectedTemplate.value);
    } catch {
      toast.error("Failed to create field");
    } finally {
      setCreating(false);
    }
  }, [fields, newField, refetchFields, selectedTemplate]);

  const handleDeleteField = useCallback(
    async (fieldId: number) => {
      if (!selectedTemplate) return;
      try {
        await fieldService.remove(fieldId);
        toast.success("Field deleted");
        refetchFields(selectedTemplate.value);
      } catch {
        toast.error("Failed to delete field");
      }
    },
    [refetchFields, selectedTemplate],
  );

  const placeholderFormatLabel = selectedTemplateMeta
    ? (PLACEHOLDER_FORMAT_LABEL[selectedTemplateMeta.placeholderFormat] ?? selectedTemplateMeta.placeholderFormat)
    : "";
  const previewToken =
    selectedTemplateMeta && newField.fieldKey.trim()
      ? placeholderFormatLabel.replace("fieldKey", newField.fieldKey.trim())
      : "";

  return (
    <div className="space-y-6">
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:shadow-neu-raised-sm transition-shadow text-gray-500"
      >
        <ArrowLeft className="w-4 h-4" />
        <IBMPlexSans600 as="span" className="text-sm">
          Back
        </IBMPlexSans600>
      </button>
      <IBMPlexSans700 as="h1" className="text-xl text-gray-900">
        Fields
      </IBMPlexSans700>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select<TemplateTypeOption>
            label="Template type"
            options={templateTypeOptions}
            value={selectedType}
            onChange={handleTypeChange}
            isDisabled={templateTypesLoading}
            placeholder="Select a template type…"
          />
          <Select<TemplateOption>
            label="Template"
            options={templateOptions}
            value={selectedTemplate}
            onChange={handleTemplateChange}
            isDisabled={!selectedType || templatesLoading}
            placeholder={selectedType ? "Select a template…" : "Pick a template type first"}
          />
        </div>
      </Card>

      {selectedTemplate && (
        <>
          <Card>
            <IBMPlexSans600 as="h2" className="text-sm text-gray-700 mb-3">
              Placeholder format
            </IBMPlexSans600>
            <IBMPlexSans400 as="p" className="text-sm text-gray-500 mb-2">
              Inherited from this template's own configuration — not editable here. Every field
              defined below wraps into this format when inserted into a section's content.
            </IBMPlexSans400>
            <div className="px-3.5 py-2.5 rounded-xl bg-surface-100 shadow-neu-pressed w-fit">
              <IBMPlexSans600 as="span" className="text-sm text-gray-700">
                {placeholderFormatLabel}
              </IBMPlexSans600>
            </div>
          </Card>

          <Card>
            <IBMPlexSans600 as="h2" className="text-sm text-gray-700 mb-3">
              Fields
            </IBMPlexSans600>
            {fieldsLoading ? (
              <IBMPlexSans400 as="p" className="text-sm text-gray-400">
                Loading…
              </IBMPlexSans400>
            ) : fields.length === 0 ? (
              <IBMPlexSans400 as="p" className="text-sm text-gray-400">
                No fields yet for this template version
              </IBMPlexSans400>
            ) : (
              <div className="space-y-2">
                {fields.map((field) => (
                  <FieldListRow
                    key={field.id}
                    field={field}
                    placeholderFormatLabel={placeholderFormatLabel}
                    onDelete={handleDeleteField}
                  />
                ))}
              </div>
            )}
          </Card>

          <Can idMenu={FIELD_MENU_ID} action="create">
            <Card>
              <IBMPlexSans600 as="h2" className="text-sm text-gray-700 mb-3">
                New field
              </IBMPlexSans600>
              <div className="flex items-end gap-3 flex-wrap">
                <Input
                  label="Field key"
                  value={newField.fieldKey}
                  onChange={handleNewFieldKeyChange}
                  placeholder="e.g. NAME"
                  className="max-w-40"
                />
                <Input
                  label="Label"
                  value={newField.fieldLabel}
                  onChange={handleNewFieldLabelChange}
                  placeholder="e.g. Full Name"
                  className="max-w-45"
                />
                <Button size="sm" onClick={handleCreateField} loading={creating}>
                  Add field
                </Button>
                {previewToken && (
                  <IBMPlexSans400 as="span" className="text-xs text-gray-500 pb-2.5">
                    Inserts as {previewToken}
                  </IBMPlexSans400>
                )}
              </div>
            </Card>
          </Can>
        </>
      )}
    </div>
  );
}

interface FieldListRowProps {
  field: TemplateFieldDto;
  placeholderFormatLabel: string;
  onDelete: (fieldId: number) => void;
}

const FieldListRow = memo(function FieldListRow({ field, placeholderFormatLabel, onDelete }: FieldListRowProps) {
  const handleDelete = useCallback(() => onDelete(field.id), [field.id, onDelete]);
  const token = placeholderFormatLabel.replace("fieldKey", field.fieldKey);

  return (
    <div className="flex items-center gap-3 flex-wrap bg-surface-100 rounded-lg shadow-neu-pressed-sm p-3">
      <IBMPlexSans600 as="span" className="text-sm text-gray-800">
        {field.fieldLabel}
      </IBMPlexSans600>
      <span className="px-2 py-0.5 rounded-full text-xs bg-surface-200 shadow-neu-pressed-sm">
        <IBMPlexSans400 as="span">{token}</IBMPlexSans400>
      </span>
      <Can idMenu={FIELD_MENU_ID} action="delete">
        <button
          onClick={handleDelete}
          title="Delete field"
          className="ml-auto p-1.5 rounded-lg hover:shadow-neu-raised-sm transition-shadow text-danger-500"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </Can>
    </div>
  );
});

export default memo(FieldListPage);
