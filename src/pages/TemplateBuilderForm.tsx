import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
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
import { SectionInlineEditor, type SectionInlineEditorHandle } from "../editor";
import TemplateFieldPanel from "../components/template/TemplateFieldPanel";
import { IBMPlexSans400, IBMPlexSans600, IBMPlexSans700 } from "../components/ui/Text";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import departmentService from "../services/departmentService";
import {
  createTemplateDraftThunk,
  createTemplateDraftUploadThunk,
  deleteSectionThunk,
  fetchTemplateByIdThunk,
  fetchTemplateTypesThunk,
  upsertSectionThunk,
} from "../store/template/templateThunks";
import { clearSelectedTemplate } from "../store/template/templateSlice";
import { templateDraftSchema } from "../validations/templateValidation";
import toast from "../utilities/toast";
import type {
  TemplateCreationMode,
  TemplatePlaceholderFormat,
  TemplateSectionDto,
  TemplateSectionKind,
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
  { value: "singleCurly", label: "{fieldKey}" },
  { value: "parentheses", label: "(fieldKey)" },
];

const DEPARTMENT_PAGE_SIZE = 20;

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

  // One ref per section's inline editor, keyed by section id, plus which section is
  // currently focused — lets the field panel (rendered once here, not per-row) insert a
  // placeholder token into whichever section editor the admin last clicked into. Each
  // SectionRow owns and creates its own ref, then reports it up via `registerEditorRef` in
  // an effect — reading/writing this map only ever happens in effects and event handlers,
  // never during render (this project's react-hooks/refs lint rule flags the latter; see
  // CLAUDE.md's note on that rule under "roleService.ts" for the same pattern elsewhere).
  const editorRefsRef = useRef(new Map<number, RefObject<SectionInlineEditorHandle>>());
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);

  const registerEditorRef = useCallback((sectionId: number, ref: RefObject<SectionInlineEditorHandle>) => {
    editorRefsRef.current.set(sectionId, ref);
    return () => {
      editorRefsRef.current.delete(sectionId);
    };
  }, []);

  const handleFieldInsert = useCallback(
    (token: string) => {
      if (activeSectionId == null) return;
      editorRefsRef.current.get(activeSectionId)?.current?.insertAtCursor(token);
    },
    [activeSectionId],
  );

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
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <div className="flex-1 min-w-0 w-full">
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
                  registerEditorRef={registerEditorRef}
                  onFocusSection={setActiveSectionId}
                />
              ))}
          </div>
        </Card>
      </div>
      <div className="w-full lg:w-80 shrink-0">
        <TemplateFieldPanel
          templateVersionId={templateId}
          placeholderFormat={placeholderFormat}
          onInsert={handleFieldInsert}
          disabled={activeSectionId == null}
        />
      </div>
    </div>
  );
});

interface SectionRowProps {
  templateId: number;
  section: TemplateSectionDto;
  registerEditorRef: (sectionId: number, ref: RefObject<SectionInlineEditorHandle>) => () => void;
  onFocusSection: (sectionId: number) => void;
}

const SectionRow = memo(function SectionRow({ templateId, section, registerEditorRef, onFocusSection }: SectionRowProps) {
  const dispatch = useAppDispatch();
  const isSectionKind = section.sectionKind === "section";
  const [label, setLabel] = useState(section.label);
  const [html, setHtml] = useState(section.defaultContentHtml);
  const [titleLocked, setTitleLocked] = useState(section.isTitleLocked);
  const [bodyLocked, setBodyLocked] = useState(section.isBodyLocked);
  const [required, setRequired] = useState(section.isRequired);
  const editorRef = useRef<SectionInlineEditorHandle>(null);

  useEffect(
    () => registerEditorRef(section.id, editorRef),
    [registerEditorRef, section.id],
  );

  const handleFocusSection = useCallback(() => onFocusSection(section.id), [onFocusSection, section.id]);

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
          // Fields are managed exclusively via the dedicated Fields page (idMenu 10727) now that
          // they're template-version-scoped, not section-scoped — a section save never resubmits
          // a field list. See CLAUDE.md's "Template governance" note on the TemplateField rescoping.
          fields: [],
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

      <SectionInlineEditor
        ref={editorRef}
        value={html}
        onChange={handleHtmlChange}
        disabled={bodyLocked}
        placeholder="Section content…"
        onFocusSection={handleFocusSection}
      />

      <div className="flex items-center gap-2">
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

export default memo(TemplateBuilderForm);
