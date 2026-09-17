import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { ArrowLeft, Plus, Trash2, Upload } from "lucide-react";
import type { LoadOptions } from "react-select-async-paginate";
import type { GroupBase } from "react-select";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import AsyncPaginateSelect from "../components/ui/AsyncPaginateSelect";
import Checkbox from "../components/ui/Checkbox";
import Button from "../components/ui/Button";
import SectionHtmlEditor from "../components/template/SectionHtmlEditor";
import { IBMPlexSans400, IBMPlexSans600, IBMPlexSans700 } from "../components/ui/Text";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import departmentService from "../services/departmentService";
import {
  createTemplateDraftThunk,
  createTemplateDraftUploadThunk,
  deleteFieldThunk,
  deleteSectionThunk,
  fetchTemplateByIdThunk,
  fetchTemplateTypesThunk,
  upsertFieldThunk,
  upsertSectionThunk,
} from "../store/template/templateThunks";
import { clearSelectedTemplate } from "../store/template/templateSlice";
import { templateDraftSchema, extractPlaceholderKeys } from "../validations/templateValidation";
import toast from "../utilities/toast";
import type {
  TemplateCreationMode,
  TemplateFieldDto,
  TemplateFieldType,
  TemplatePlaceholderFormat,
  TemplateSectionDto,
  TemplateSectionKind,
  UpsertFieldRequestDto,
} from "../types/template";

interface TemplateTypeOption {
  value: number;
  label: string;
}

interface DepartmentOption {
  value: number;
  label: string;
}

interface DraftFormValues {
  templateName: string;
  templateTypeId: number | null;
  department: DepartmentOption | null;
  reviewInDays: number;
}

const PLACEHOLDER_FORMAT_OPTIONS: { value: TemplatePlaceholderFormat; label: string }[] = [
  { value: "doubleCurly", label: "{{fieldKey}}" },
  { value: "doubleSquare", label: "[[fieldKey]]" },
  { value: "singleSquare", label: "[fieldKey]" },
];

const DEPARTMENT_PAGE_SIZE = 20;

const FIELD_TYPE_OPTIONS: { value: TemplateFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textArea", label: "Text area" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "dropdown", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
];

function TemplateBuilderForm() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const templateId = id ? Number(id) : null;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { selected, templateTypes, saving } = useAppSelector((s) => s.template);

  const [creationMode, setCreationMode] = useState<TemplateCreationMode>("formBuilder");
  const [placeholderFormat, setPlaceholderFormat] = useState<TemplatePlaceholderFormat>("doubleCurly");
  const [file, setFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<DraftFormValues>({
    resolver: yupResolver(templateDraftSchema) as never,
    defaultValues: { templateName: "", templateTypeId: null, department: null, reviewInDays: 30 },
  });

  useEffect(() => {
    dispatch(fetchTemplateTypesThunk());
    if (templateId) dispatch(fetchTemplateByIdThunk(templateId));
    return () => {
      if (templateId) dispatch(clearSelectedTemplate());
    };
  }, [dispatch, templateId]);

  useEffect(() => {
    if (selected && isEditMode) {
      reset({
        templateName: selected.templateName,
        templateTypeId: selected.templateTypeId,
        department: { value: selected.departmentId, label: selected.departmentName },
        reviewInDays: selected.reviewInDays,
      });
      setPlaceholderFormat(selected.placeholderFormat);
      setCreationMode(selected.creationMode);
    }
  }, [selected, isEditMode, reset]);

  const templateTypeOptions: TemplateTypeOption[] = useMemo(
    () => templateTypes.map((t) => ({ value: t.id, label: t.typeName })),
    [templateTypes],
  );

  const handleModeChange = useCallback((mode: TemplateCreationMode) => setCreationMode(mode), []);
  const handleFormBuilderMode = useCallback(() => handleModeChange("formBuilder"), [handleModeChange]);
  const handleDocxUploadMode = useCallback(() => handleModeChange("docxUpload"), [handleModeChange]);

  const handlePlaceholderFormatChange = useCallback(
    (opt: { value: TemplatePlaceholderFormat; label: string } | null) => {
      if (opt) setPlaceholderFormat(opt.value);
    },
    [],
  );

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  }, []);

  // react-select-async-paginate's loadOptions shape: (search, loadedOptions, additional) =>
  // { options, hasMore, additional }. `additional.page` tracks which page to fetch next —
  // pageSize is fixed at 20 (DEPARTMENT_PAGE_SIZE), hasMore derived from totalCount vs the
  // number of items loaded so far.
  const loadDepartmentOptions: LoadOptions<DepartmentOption, GroupBase<DepartmentOption>, { page: number }> =
    useCallback(async (search, loadedOptions, additional) => {
      const page = additional?.page ?? 1;
      const { items, totalCount } = await departmentService.listDepartments({
        search,
        page,
        pageSize: DEPARTMENT_PAGE_SIZE,
      });
      const options = items.map((d) => ({ value: d.departmentId, label: d.departmentName }));
      const loadedCount = loadedOptions.length + options.length;
      return {
        options,
        hasMore: loadedCount < totalCount,
        additional: { page: page + 1 },
      };
    }, []);

  const onSubmit = useCallback(
    async (values: DraftFormValues) => {
      if (isEditMode) return; // draft metadata is immutable post-creation in this pass
      const departmentId = values.department!.value;
      const departmentName = values.department!.label;
      if (creationMode === "docxUpload") {
        if (!file) {
          toast.error("Choose a .docx file to upload");
          return;
        }
        const res = await dispatch(
          createTemplateDraftUploadThunk({
            payload: {
              templateTypeId: values.templateTypeId!,
              templateName: values.templateName,
              departmentId,
              departmentName,
              placeholderFormat,
              reviewInDays: values.reviewInDays,
            },
            file,
          }),
        );
        if (createTemplateDraftUploadThunk.fulfilled.match(res)) {
          toast.success("Template draft created from document");
          navigate(`/templates/${res.payload.id}/edit`);
        } else toast.error(res.payload ?? "Failed to upload template document");
        return;
      }

      const res = await dispatch(
        createTemplateDraftThunk({
          templateTypeId: values.templateTypeId!,
          templateName: values.templateName,
          departmentId,
          departmentName,
          creationMode: "formBuilder",
          placeholderFormat,
          reviewInDays: values.reviewInDays,
          sections: [],
        }),
      );
      if (createTemplateDraftThunk.fulfilled.match(res)) {
        toast.success("Template draft created");
        navigate(`/templates/${res.payload.id}/edit`);
      } else toast.error(res.payload ?? "Failed to create template draft");
    },
    [creationMode, dispatch, file, isEditMode, navigate, placeholderFormat],
  );

  const isDraftStatus = !isEditMode || selected?.status === "draft";
  const handleBack = useCallback(() => navigate(-1), [navigate]);

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
        {isEditMode ? `Edit template — ${selected?.templateName ?? ""}` : "New template"}
      </IBMPlexSans700>

      {!isEditMode && (
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant={creationMode === "formBuilder" ? "primary" : "secondary"} onClick={handleFormBuilderMode}>
                Form builder
              </Button>
              <Button type="button" size="sm" variant={creationMode === "docxUpload" ? "primary" : "secondary"} onClick={handleDocxUploadMode}>
                Upload .docx
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Template name" {...register("templateName")} error={errors.templateName?.message} />
              <Controller
                name="templateTypeId"
                control={control}
                render={({ field }) => (
                  <Select<TemplateTypeOption>
                    label="Template type"
                    options={templateTypeOptions}
                    value={templateTypeOptions.find((o) => o.value === field.value) ?? null}
                    onChange={(opt) => field.onChange(opt?.value ?? null)}
                    placeholder="Select…"
                    error={errors.templateTypeId?.message}
                  />
                )}
              />
              <Controller
                name="department"
                control={control}
                render={({ field }) => (
                  <AsyncPaginateSelect<DepartmentOption, { page: number }>
                    label="Department"
                    loadPageOptions={loadDepartmentOptions}
                    additional={{ page: 1 }}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Search department…"
                    error={errors.department?.message}
                    selectRef={field.ref as never}
                  />
                )}
              />
              <Input
                label="Review interval (days)"
                type="number"
                {...register("reviewInDays", { valueAsNumber: true })}
                error={errors.reviewInDays?.message}
              />
              <Select
                label="Placeholder format"
                options={PLACEHOLDER_FORMAT_OPTIONS}
                value={PLACEHOLDER_FORMAT_OPTIONS.find((o) => o.value === placeholderFormat) ?? null}
                onChange={handlePlaceholderFormatChange}
                isClearable={false}
              />
            </div>

            {creationMode === "docxUpload" && (
              <div>
                <IBMPlexSans600 as="label" className="block text-sm text-gray-700 mb-1.5">
                  Document (.docx, max 60MB)
                </IBMPlexSans600>
                <label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-100 shadow-neu-pressed cursor-pointer w-fit">
                  <Upload className="w-4 h-4 text-gray-500" />
                  <IBMPlexSans400 as="span" className="text-sm text-gray-600">
                    {file ? file.name : "Choose file…"}
                  </IBMPlexSans400>
                  <input type="file" accept=".docx" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            )}

            <Button type="submit" loading={saving}>
              <Plus className="w-4 h-4" /> Create draft
            </Button>
          </form>
        </Card>
      )}

      {isEditMode && selected && (
        <SectionBuilder
          templateId={selected.id}
          sections={selected.sections}
          placeholderFormat={selected.placeholderFormat}
          isDraft={isDraftStatus}
        />
      )}
    </div>
  );
}

interface SectionBuilderProps {
  templateId: number;
  sections: TemplateSectionDto[];
  placeholderFormat: TemplatePlaceholderFormat;
  isDraft: boolean;
}

const SectionBuilder = memo(function SectionBuilder({ templateId, sections, placeholderFormat, isDraft }: SectionBuilderProps) {
  const dispatch = useAppDispatch();

  const hasHeader = useMemo(() => sections.some((s) => s.sectionKind === "header"), [sections]);
  const hasFooter = useMemo(() => sections.some((s) => s.sectionKind === "footer"), [sections]);

  const handleAddSection = useCallback(
    (kind: TemplateSectionKind) => async () => {
      const nextOrder = sections.length ? Math.max(...sections.map((s) => s.sectionOrder)) + 1 : 0;
      const res = await dispatch(
        upsertSectionThunk({
          templateId,
          payload: {
            id: null,
            sectionKind: kind,
            sectionKey: `${kind}_${Date.now()}`,
            label: kind === "header" ? "Header" : kind === "footer" ? "Footer" : "New section",
            titleVisibleInDocument: kind === "section",
            isTitleLocked: false,
            isBodyLocked: false,
            isRequired: false,
            defaultContentHtml: "",
            placeholderText: null,
            sectionOrder: nextOrder,
            pageIndex: null,
            overlayLeft: null,
            overlayTop: null,
            overlayWidth: null,
            overlayHeight: null,
            boundBookmarkTag: null,
            fields: [],
          },
        }),
      );
      if (!upsertSectionThunk.fulfilled.match(res)) toast.error(res.payload ?? "Failed to add section");
    },
    [dispatch, sections, templateId],
  );

  if (!isDraft) {
    return (
      <Card>
        <IBMPlexSans400 as="p" className="text-sm text-gray-500">
          Section/field editing is only available while the template is in draft status.
        </IBMPlexSans400>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <IBMPlexSans600 as="h2" className="text-sm text-gray-700">
            Sections
          </IBMPlexSans600>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={hasHeader} onClick={handleAddSection("header")}>
              + Header
            </Button>
            <Button size="sm" variant="secondary" disabled={hasFooter} onClick={handleAddSection("footer")}>
              + Footer
            </Button>
            <Button size="sm" variant="secondary" onClick={handleAddSection("section")}>
              + Body section
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          {sections
            .slice()
            .sort((a, b) => a.sectionOrder - b.sectionOrder)
            .map((section) => (
              <SectionRow
                key={section.id}
                templateId={templateId}
                section={section}
                placeholderFormat={placeholderFormat}
              />
            ))}
        </div>
      </Card>
    </div>
  );
});

interface SectionRowProps {
  templateId: number;
  section: TemplateSectionDto;
  placeholderFormat: TemplatePlaceholderFormat;
}

const DEFAULT_NEW_FIELD = { fieldKey: "", fieldLabel: "", fieldType: "text" as TemplateFieldType };

const SectionRow = memo(function SectionRow({ templateId, section, placeholderFormat }: SectionRowProps) {
  const dispatch = useAppDispatch();
  const isSectionKind = section.sectionKind === "section";
  const [label, setLabel] = useState(section.label);
  const [html, setHtml] = useState(section.defaultContentHtml);
  const [titleLocked, setTitleLocked] = useState(section.isTitleLocked);
  const [bodyLocked, setBodyLocked] = useState(section.isBodyLocked);
  const [required, setRequired] = useState(section.isRequired);
  const [newField, setNewField] = useState<{ fieldKey: string; fieldLabel: string; fieldType: TemplateFieldType } | null>(
    null,
  );

  const handleLabelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value), []);
  const handleHtmlChange = useCallback((v: string) => setHtml(v), []);
  const handleTitleLockedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTitleLocked(e.target.checked), []);
  const handleBodyLockedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setBodyLocked(e.target.checked), []);
  const handleRequiredChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setRequired(e.target.checked), []);

  const isDirty = useMemo(
    () =>
      label !== section.label ||
      html !== section.defaultContentHtml ||
      titleLocked !== section.isTitleLocked ||
      bodyLocked !== section.isBodyLocked ||
      required !== section.isRequired,
    [label, html, titleLocked, bodyLocked, required, section],
  );

  const matchedKeys = useMemo(() => extractPlaceholderKeys(html, placeholderFormat), [html, placeholderFormat]);
  const unmatchedFields = useMemo(
    () => section.fields.filter((f) => !matchedKeys.has(f.fieldKey)),
    [section.fields, matchedKeys],
  );

  const handleSave = useCallback(async () => {
    const res = await dispatch(
      upsertSectionThunk({
        templateId,
        payload: {
          id: section.id,
          sectionKind: section.sectionKind,
          sectionKey: section.sectionKey,
          label,
          titleVisibleInDocument: section.titleVisibleInDocument,
          isTitleLocked: isSectionKind ? titleLocked : false,
          isBodyLocked: bodyLocked,
          isRequired: required,
          defaultContentHtml: html,
          placeholderText: section.placeholderText,
          sectionOrder: section.sectionOrder,
          pageIndex: section.pageIndex,
          overlayLeft: section.overlayLeft,
          overlayTop: section.overlayTop,
          overlayWidth: section.overlayWidth,
          overlayHeight: section.overlayHeight,
          boundBookmarkTag: section.boundBookmarkTag,
          fields: section.fields.map((f) => ({
            id: f.id,
            fieldKey: f.fieldKey,
            fieldLabel: f.fieldLabel,
            fieldType: f.fieldType,
            isRequired: f.isRequired,
            defaultValue: f.defaultValue,
            validationRegex: f.validationRegex,
            fieldOrder: f.fieldOrder,
            options: f.options.map((o) => ({ optionLabel: o.optionLabel, optionValue: o.optionValue, optionOrder: o.optionOrder })),
          })),
        },
      }),
    );
    if (upsertSectionThunk.fulfilled.match(res)) toast.success("Section saved");
    else toast.error(res.payload ?? "Failed to save section");
  }, [bodyLocked, dispatch, html, isSectionKind, label, required, section, templateId, titleLocked]);

  const handleDelete = useCallback(async () => {
    const res = await dispatch(deleteSectionThunk({ templateId, sectionId: section.id }));
    if (!deleteSectionThunk.fulfilled.match(res)) toast.error(res.payload ?? "Failed to delete section");
  }, [dispatch, section.id, templateId]);

  const handleShowAddField = useCallback(() => setNewField(DEFAULT_NEW_FIELD), []);
  const handleCancelAddField = useCallback(() => setNewField(null), []);

  const handleNewFieldKeyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setNewField((prev) => (prev ? { ...prev, fieldKey: e.target.value } : prev)),
    [],
  );
  const handleNewFieldLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setNewField((prev) => (prev ? { ...prev, fieldLabel: e.target.value } : prev)),
    [],
  );
  const handleNewFieldTypeChange = useCallback(
    (opt: { value: TemplateFieldType; label: string } | null) =>
      opt && setNewField((prev) => (prev ? { ...prev, fieldType: opt.value } : prev)),
    [],
  );

  const handleConfirmAddField = useCallback(async () => {
    if (!newField) return;
    if (!newField.fieldKey.trim() || !newField.fieldLabel.trim()) {
      toast.error("Field key and label are required");
      return;
    }
    const nextOrder = section.fields.length ? Math.max(...section.fields.map((f) => f.fieldOrder)) + 1 : 0;
    const payload: UpsertFieldRequestDto = {
      id: null,
      fieldKey: newField.fieldKey.trim(),
      fieldLabel: newField.fieldLabel.trim(),
      fieldType: newField.fieldType,
      isRequired: false,
      defaultValue: null,
      validationRegex: null,
      fieldOrder: nextOrder,
      options: [],
    };
    const res = await dispatch(upsertFieldThunk({ templateId, sectionId: section.id, payload }));
    if (upsertFieldThunk.fulfilled.match(res)) {
      toast.success("Field added");
      setNewField(null);
    } else toast.error(res.payload ?? "Failed to add field");
  }, [dispatch, newField, section.fields, section.id, templateId]);

  return (
    <div className="rounded-xl shadow-neu-pressed-sm p-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {isSectionKind ? (
          <Input value={label} onChange={handleLabelChange} className="max-w-[240px]" />
        ) : (
          <IBMPlexSans600 as="span" className="text-sm text-gray-700">
            {section.sectionKind === "header" ? "Header" : "Footer"}
          </IBMPlexSans600>
        )}
        <IBMPlexSans400 as="span" className="text-xs text-gray-400 uppercase">
          {section.sectionKind}
        </IBMPlexSans400>
        <div className="flex items-center gap-3 ml-auto">
          {isSectionKind && <Checkbox label="Lock title" checked={titleLocked} onChange={handleTitleLockedChange} />}
          <Checkbox label="Lock body" checked={bodyLocked} onChange={handleBodyLockedChange} />
          <Checkbox label="Required" checked={required} onChange={handleRequiredChange} />
        </div>
      </div>

      <SectionHtmlEditor value={html} onChange={handleHtmlChange} disabled={bodyLocked} placeholder="Section content…" />

      {section.fields.length > 0 && (
        <p className={`text-xs ${unmatchedFields.length ? "text-danger-600" : "text-success-600"}`}>
          {unmatchedFields.length
            ? `Missing placeholder token for: ${unmatchedFields.map((f) => f.fieldKey).join(", ")}`
            : "All bound field keys are present as placeholders in this section's content."}
        </p>
      )}

      <div className="space-y-2">
        {section.fields.map((field) => (
          <FieldRow key={field.id} templateId={templateId} sectionId={section.id} field={field} />
        ))}
      </div>

      {newField && (
        <div className="flex items-center gap-2 flex-wrap bg-surface-100 rounded-lg shadow-neu-pressed-sm p-2">
          <Input
            value={newField.fieldKey}
            onChange={handleNewFieldKeyChange}
            className="max-w-[140px]"
            placeholder="fieldKey (must match a placeholder in the content above)"
          />
          <Input value={newField.fieldLabel} onChange={handleNewFieldLabelChange} className="max-w-[160px]" placeholder="Label" />
          <Select
            options={FIELD_TYPE_OPTIONS}
            value={FIELD_TYPE_OPTIONS.find((o) => o.value === newField.fieldType) ?? null}
            onChange={handleNewFieldTypeChange}
            isClearable={false}
            className="min-w-[140px]"
          />
          <Button size="sm" onClick={handleConfirmAddField}>
            Add
          </Button>
          <Button size="sm" variant="secondary" onClick={handleCancelAddField}>
            Cancel
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {!newField && (
          <Button size="sm" variant="secondary" onClick={handleShowAddField}>
            + Field
          </Button>
        )}
        <Button size="sm" onClick={handleSave}>
          {isDirty ? "Save section •" : "Save section"}
        </Button>
        <Button size="sm" variant="danger" onClick={handleDelete}>
          <Trash2 className="w-3.5 h-3.5" /> Delete section
        </Button>
      </div>
    </div>
  );
});

interface FieldRowProps {
  templateId: number;
  sectionId: number;
  field: TemplateFieldDto;
}

const FieldRow = memo(function FieldRow({ templateId, sectionId, field }: FieldRowProps) {
  const dispatch = useAppDispatch();
  const [fieldKey, setFieldKey] = useState(field.fieldKey);
  const [fieldLabel, setFieldLabel] = useState(field.fieldLabel);
  const [fieldType, setFieldType] = useState<TemplateFieldType>(field.fieldType);
  const [required, setRequired] = useState(field.isRequired);

  const handleKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFieldKey(e.target.value), []);
  const handleLabelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFieldLabel(e.target.value), []);
  const handleTypeChange = useCallback(
    (opt: { value: TemplateFieldType; label: string } | null) => opt && setFieldType(opt.value),
    [],
  );
  const handleRequiredChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setRequired(e.target.checked), []);

  const handleSave = useCallback(async () => {
    const res = await dispatch(
      upsertFieldThunk({
        templateId,
        sectionId,
        payload: {
          id: field.id,
          fieldKey,
          fieldLabel,
          fieldType,
          isRequired: required,
          defaultValue: field.defaultValue,
          validationRegex: field.validationRegex,
          fieldOrder: field.fieldOrder,
          options: field.options.map((o) => ({ optionLabel: o.optionLabel, optionValue: o.optionValue, optionOrder: o.optionOrder })),
        },
      }),
    );
    if (upsertFieldThunk.fulfilled.match(res)) toast.success("Field saved");
    else toast.error(res.payload ?? "Failed to save field");
  }, [dispatch, field.defaultValue, field.fieldOrder, field.id, field.options, field.validationRegex, fieldKey, fieldLabel, fieldType, required, sectionId, templateId]);

  const handleDelete = useCallback(async () => {
    const res = await dispatch(deleteFieldThunk({ templateId, sectionId, fieldId: field.id }));
    if (!deleteFieldThunk.fulfilled.match(res)) toast.error(res.payload ?? "Failed to delete field");
  }, [dispatch, field.id, sectionId, templateId]);

  return (
    <div className="flex items-center gap-2 flex-wrap bg-surface-100 rounded-lg shadow-neu-pressed-sm p-2">
      <Input value={fieldKey} onChange={handleKeyChange} className="max-w-[140px]" placeholder="fieldKey" />
      <Input value={fieldLabel} onChange={handleLabelChange} className="max-w-[160px]" placeholder="Label" />
      <Select
        options={FIELD_TYPE_OPTIONS}
        value={FIELD_TYPE_OPTIONS.find((o) => o.value === fieldType) ?? null}
        onChange={handleTypeChange}
        isClearable={false}
        className="min-w-[140px]"
      />
      <Checkbox label="Required" checked={required} onChange={handleRequiredChange} />
      <Button size="sm" onClick={handleSave}>
        Save
      </Button>
      <Button size="sm" variant="danger" onClick={handleDelete}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
});

export default memo(TemplateBuilderForm);
