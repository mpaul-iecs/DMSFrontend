import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { ArrowLeft, ChevronDown, ExternalLink, Eye, Plus, Trash2, Upload } from "lucide-react";
import type { LoadOptions } from "react-select-async-paginate";
import type { GroupBase } from "react-select";
import Card from "../components/ui/Card";
import TemplateBuilderSkeleton from "../components/template/TemplateBuilderSkeleton";
import Badge, { type BadgeVariant } from "../components/ui/Badge";
import Tooltip from "../components/ui/Tooltip";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import AsyncPaginateSelect from "../components/ui/AsyncPaginateSelect";
import Checkbox from "../components/ui/Checkbox";
import Button from "../components/ui/Button";
import { SectionInlineEditor, type EditorSectionInput, type SectionInlineEditorHandle } from "../editor";
import TemplateDocumentPreviewCard from "../components/template/TemplateDocumentPreviewCard";
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
import { STATUS_LABEL } from "../utilities/templateStatus";
import type {
  TemplateCreationMode,
  TemplatePlaceholderFormat,
  TemplateSectionDto,
  TemplateSectionKind,
  TemplateStatus,
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

const NO_SECTIONS: TemplateSectionDto[] = [];

// Module-level so its identity is stable (the preview card memoizes its header on it).
const PREVIEW_ICON = <Eye className="w-4 h-4 text-gray-500 shrink-0" />;

/** Unsaved per-section edits reported up to SectionBuilder for the live preview. */
interface SectionDraft {
  html?: string;
  label?: string;
}

const STATUS_VARIANT: Record<TemplateStatus, BadgeVariant> = {
  draft: "draft",
  pendingApproval: "pendingApproval",
  approved: "approved",
  rejected: "rejected",
  deprecated: "deprecated",
};

function TemplateFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const templateId = id ? Number(id) : null;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { selected, selectedLoading, templateTypes, saving } = useAppSelector((s) => s.template);

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

  // Sections/fields are editable in every status except rejected (mirrors the backend's
  // TemplateService/FieldService.EnsureEditable).
  const canEditSections = !isEditMode || selected?.status !== "rejected";
  const handleBack = useCallback(() => navigate(-1), [navigate]);

  const handleOpenEditor = useCallback(() => {
    // Deliberately no "noopener,noreferrer" — same sessionStorage-auth reason as
    // TemplateDetailPage.handleOpenEditor. Not gated by <Can>: view-only users get read-only.
    window.open(
      `/templates/${templateId}/editor`,
      "documentPopup",
      "width=1200,height=800,left=100,top=50,resizable=yes,scrollbars=yes",
    );
  }, [templateId]);

  // Edit mode: nothing to render until the template arrives (the section builder needs it), so show
  // the layout-matching skeleton. Keyed off `selected`/`selectedLoading` only — saving a section never
  // toggles selectedLoading, so this can't unmount the builder (and lose unsaved edits) mid-session.
  if (isEditMode && (!selected || selectedLoading)) return <TemplateBuilderSkeleton />;

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
      {!isEditMode && (
        <IBMPlexSans700 as="h1" className="text-xl text-gray-900">
          New template
        </IBMPlexSans700>
      )}

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
                className="no-spinner"
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
          isEditable={canEditSections}
          templateName={selected.templateName}
          versionLabel={selected.versionLabel}
          status={selected.status}
          onOpenEditor={handleOpenEditor}
        />
      )}
    </div>
  );
}

interface SectionBuilderProps {
  templateId: number;
  sections: TemplateSectionDto[];
  placeholderFormat: TemplatePlaceholderFormat;
  isEditable: boolean;
  templateName: string;
  versionLabel: string;
  status: TemplateStatus;
  onOpenEditor: () => void;
}

const SectionBuilder = memo(function SectionBuilder({
  templateId,
  sections,
  placeholderFormat,
  isEditable,
  templateName,
  versionLabel,
  status,
  onOpenEditor,
}: SectionBuilderProps) {
  const dispatch = useAppDispatch();


  // One ref per section's inline editor, keyed by section id, plus which section is
  // currently focused — lets the field panel (rendered once here, not per-row) insert a
  // placeholder token into whichever section editor the admin last clicked into. Each
  // SectionRow owns and creates its own ref, then reports it up via `registerEditorRef` in
  // an effect — reading/writing this map only ever happens in effects and event handlers,
  // never during render (this project's react-hooks/refs lint rule flags the latter; see
  // CLAUDE.md's note on that rule under "roleService.ts" for the same pattern elsewhere).
  const editorRefsRef = useRef(new Map<number, RefObject<SectionInlineEditorHandle>>());
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);

  // Unsaved in-editor HTML per section (reported up by each SectionRow's onChange), so the live
  // preview reflects edits before "Save section" is clicked. Falls back to the persisted HTML.
  const [drafts, setDrafts] = useState<Record<number, SectionDraft>>({});
  const handleDraftChange = useCallback((sectionId: number, patch: SectionDraft) => {
    setDrafts((prev) => ({ ...prev, [sectionId]: { ...prev[sectionId], ...patch } }));
  }, []);

  const previewSections = useMemo<EditorSectionInput[]>(
    () =>
      sections.map((s) => {
        const draft = drafts[s.id];
        return {
          id: s.id,
          kind: s.sectionKind === "header" ? "header" : s.sectionKind === "footer" ? "footer" : "body",
          order: s.sectionOrder,
          page: s.pageIndex ?? 1,
          // The section heading (its label) is part of the rendered page when the title is visible.
          title: s.sectionKind === "section" && s.titleVisibleInDocument ? (draft?.label ?? s.label) : undefined,
          html: draft?.html ?? s.defaultContentHtml,
        };
      }),
    [sections, drafts],
  );

  // A "page" is the group of body sections sharing a PageIndex (1-based; null = page 1, so
  // templates from before multi-page support are a single page). The backend export puts a hard
  // page break between pages. A page always has >= 1 section: "+ Page" creates a blank section,
  // and deleting a page deletes its sections. Gaps in PageIndex (after a page delete) are fine —
  // pages are labelled by position, not by raw index.
  const headerSections = useMemo(() => sections.filter((s) => s.sectionKind === "header"), [sections]);
  const footerSections = useMemo(() => sections.filter((s) => s.sectionKind === "footer"), [sections]);
  const pages = useMemo(() => {
    const byPage = new Map<number, TemplateSectionDto[]>();
    for (const sec of sections.filter((x) => x.sectionKind === "section")) {
      const key = sec.pageIndex ?? 1;
      byPage.set(key, [...(byPage.get(key) ?? []), sec]);
    }
    return [...byPage.entries()]
      .sort(([a], [b]) => a - b)
      .map(([page, list]) => ({ page, sections: list.slice().sort((a, b) => a.sectionOrder - b.sectionOrder) }));
  }, [sections]);

  // Which pages are expanded (only meaningful with > 1 page). Collapsed pages stay MOUNTED
  // (hidden via CSS) so unsaved edits in their editors aren't lost on collapse.
  const [expandedPages, setExpandedPages] = useState<Set<number>>(() => new Set([pages[0]?.page ?? 1]));
  const handleTogglePage = useCallback((page: number) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(page)) next.delete(page);
      else next.add(page);
      return next;
    });
  }, []);

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

  const addSection = useCallback(
    async (kind: TemplateSectionKind, pageIndex: number | null): Promise<boolean> => {
      const nextOrder = sections.length ? Math.max(...sections.map((x) => x.sectionOrder)) + 1 : 0;
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
            pageIndex: kind === "section" ? pageIndex : null,
            overlayLeft: null,
            overlayTop: null,
            overlayWidth: null,
            overlayHeight: null,
            boundBookmarkTag: null,
            fields: [],
          },
        }),
      );
      const ok = upsertSectionThunk.fulfilled.match(res);
      if (!ok) toast.error(res.payload ?? "Failed to add section");
      return ok;
    },
    [dispatch, sections, templateId],
  );

  const handleAddHeader = useCallback(() => void addSection("header", null), [addSection]);
  const handleAddFooter = useCallback(() => void addSection("footer", null), [addSection]);
  const handleAddSectionToPage = useCallback((page: number) => void addSection("section", page), [addSection]);
  const handleAddPage = useCallback(async () => {
    const nextPage = pages.length ? pages[pages.length - 1].page + 1 : 1;
    if (await addSection("section", nextPage)) {
      // Collapse the rest so the new page is the focus and the form stays easy to scan.
      setExpandedPages(new Set([nextPage]));
    }
  }, [addSection, pages]);

  const handleDeletePage = useCallback(
    async (page: number) => {
      const target = pages.find((pg) => pg.page === page);
      if (!target) return;
      if (
        !window.confirm(
          `Delete this page and its ${target.sections.length} section(s)? Unsaved edits on it are lost.${
            target === pages[0] ? " The header and footer are kept." : ""
          }`,
        )
      )
        return;
      for (const sec of target.sections) {
        const res = await dispatch(deleteSectionThunk({ templateId, sectionId: sec.id }));
        if (!deleteSectionThunk.fulfilled.match(res)) {
          toast.error(res.payload ?? "Failed to delete page");
          return;
        }
      }
    },
    [dispatch, pages, templateId],
  );

  const titleRow = (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 flex-wrap">
        <IBMPlexSans700 as="h1" className="text-xl text-gray-900">
          Edit template — {templateName}
        </IBMPlexSans700>
        {isEditable && (
          <IBMPlexSans400 as="span" className="text-sm text-gray-500">
            {pages.length} page{pages.length === 1 ? "" : "s"}
          </IBMPlexSans400>
        )}
        <IBMPlexSans600 as="span" className="text-sm text-gray-500">
          {versionLabel}
        </IBMPlexSans600>
        <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
      </div>
      <div className="flex items-center gap-2">
        {isEditable && (
          <Button size="sm" variant="secondary" onClick={handleAddPage}>
            <Plus className="w-3.5 h-3.5" /> Add page
          </Button>
        )}
        <Tooltip content="Open full editor in new window" placement="bottom">
          <button
            onClick={onOpenEditor}
            aria-label="Open full editor in new window"
            className="p-2 rounded-lg hover:shadow-neu-raised-sm transition-shadow text-gray-500"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>
    </div>
  );

  if (!isEditable) {
    return (
      <div className="space-y-6">
        {titleRow}
        <Card>
          <IBMPlexSans400 as="p" className="text-sm text-gray-500">
            This template was rejected, so its sections can't be edited.
          </IBMPlexSans400>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {titleRow}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Pages sit directly on the page background — each PagePanel is itself the accordion. */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Header and footer are template-wide (repeated on every sheet), but they're edited
              inside the FIRST page's panel — that's where they sit in a real document. */}
          {pages.map((pg, i) => (
            <PagePanel
              key={pg.page}
              page={pg.page}
              ordinal={i + 1}
              total={pages.length}
              sections={pg.sections}
              headerSections={i === 0 ? headerSections : NO_SECTIONS}
              footerSections={i === 0 ? footerSections : NO_SECTIONS}
              isFirst={i === 0}
              expanded={expandedPages.has(pg.page)}
              templateId={templateId}
              onToggle={handleTogglePage}
              onAddSection={handleAddSectionToPage}
              onAddHeader={handleAddHeader}
              onAddFooter={handleAddFooter}
              onDeletePage={handleDeletePage}
              registerEditorRef={registerEditorRef}
              onFocusSection={setActiveSectionId}
              onDraftChange={handleDraftChange}
            />
          ))}
        </div>
        <div className="w-full lg:w-96 shrink-0 space-y-4 lg:sticky lg:top-4">
          <TemplateFieldPanel
            templateVersionId={templateId}
            placeholderFormat={placeholderFormat}
            onInsert={handleFieldInsert}
            disabled={activeSectionId == null}
          />
          <TemplateDocumentPreviewCard
            title="Live preview"
            subtitle="includes unsaved edits"
            icon={PREVIEW_ICON}
            sections={previewSections}
          />
        </div>
      </div>
    </div>
  );
});

interface PagePanelProps {
  page: number;
  ordinal: number;
  total: number;
  sections: TemplateSectionDto[];
  /** Header/footer rows, only passed to the first page's panel (empty for the rest). */
  headerSections: TemplateSectionDto[];
  footerSections: TemplateSectionDto[];
  isFirst: boolean;
  expanded: boolean;
  templateId: number;
  onToggle: (page: number) => void;
  onAddSection: (page: number) => void;
  onAddHeader: () => void;
  onAddFooter: () => void;
  onDeletePage: (page: number) => void;
  registerEditorRef: (sectionId: number, ref: RefObject<SectionInlineEditorHandle>) => () => void;
  onFocusSection: (sectionId: number) => void;
  onDraftChange: (sectionId: number, patch: SectionDraft) => void;
}

/** One page: a framed panel with a "Page N" header. With several pages the header becomes a
 * collapsible toggle (chevron) with a delete button; with one page it's a plain label.
 * The first page's panel also hosts the template-wide header + footer sections and their
 * add buttons. Collapsed content is hidden, not unmounted, so unsaved edits survive. */
const PagePanel = memo(function PagePanel({
  page,
  ordinal,
  total,
  sections,
  headerSections,
  footerSections,
  isFirst,
  expanded,
  templateId,
  onToggle,
  onAddSection,
  onAddHeader,
  onAddFooter,
  onDeletePage,
  registerEditorRef,
  onFocusSection,
  onDraftChange,
}: PagePanelProps) {
  const collapsible = total > 1;
  const open = !collapsible || expanded;
  const handleToggle = useCallback(() => onToggle(page), [onToggle, page]);
  const handleAdd = useCallback(() => onAddSection(page), [onAddSection, page]);
  const handleDelete = useCallback(() => onDeletePage(page), [onDeletePage, page]);
  const sectionCount = sections.length + headerSections.length + footerSections.length;

  const renderRow = (section: TemplateSectionDto) => (
    <SectionRow
      key={section.id}
      templateId={templateId}
      section={section}
      registerEditorRef={registerEditorRef}
      onFocusSection={onFocusSection}
      onDraftChange={onDraftChange}
    />
  );

  return (
    <div className="rounded-xl shadow-neu-raised-sm p-3 space-y-3">
      <div className="flex items-center gap-2">
        {collapsible ? (
          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={open}
            className="flex flex-1 items-center gap-2 min-w-0 text-left rounded-lg px-1 py-1 cursor-pointer"
          >
            <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
            <IBMPlexSans600 as="span" className="text-sm text-gray-800">
              Page {ordinal}
            </IBMPlexSans600>
            <IBMPlexSans400 as="span" className="text-xs text-gray-400 truncate">
              {sectionCount} section{sectionCount === 1 ? "" : "s"}
            </IBMPlexSans400>
          </button>
        ) : (
          <div className="flex flex-1 items-center gap-2 min-w-0 px-1 py-1">
            <IBMPlexSans600 as="span" className="text-sm text-gray-800">
              Page {ordinal}
            </IBMPlexSans600>
            <IBMPlexSans400 as="span" className="text-xs text-gray-400 truncate">
              {sectionCount} section{sectionCount === 1 ? "" : "s"}
            </IBMPlexSans400>
          </div>
        )}
        {collapsible && (
          <Tooltip content="Delete page" placement="left">
            <button
              type="button"
              onClick={handleDelete}
              aria-label={`Delete page ${ordinal}`}
              className="p-1.5 rounded-lg hover:shadow-neu-raised-sm transition-shadow text-danger-500 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </Tooltip>
        )}
      </div>

      <div className={open ? "space-y-4" : "hidden"}>
        {isFirst && (headerSections.length > 0 || footerSections.length > 0 || total > 1) && (
          <IBMPlexSans400 as="p" className="text-xs text-gray-400">
            Header and footer repeat on every page.
          </IBMPlexSans400>
        )}
        {headerSections.map(renderRow)}
        {sections.map(renderRow)}
        {footerSections.map(renderRow)}
        <div className="flex items-center gap-2 flex-wrap">
          {isFirst && headerSections.length === 0 && (
            <Button size="sm" variant="secondary" onClick={onAddHeader}>
              <Plus className="w-3.5 h-3.5" /> Header
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={handleAdd}>
            <Plus className="w-3.5 h-3.5" /> Section
          </Button>
          {isFirst && footerSections.length === 0 && (
            <Button size="sm" variant="secondary" onClick={onAddFooter}>
              <Plus className="w-3.5 h-3.5" /> Footer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

interface SectionRowProps {
  templateId: number;
  section: TemplateSectionDto;
  registerEditorRef: (sectionId: number, ref: RefObject<SectionInlineEditorHandle>) => () => void;
  onFocusSection: (sectionId: number) => void;
  onDraftChange: (sectionId: number, patch: SectionDraft) => void;
}

const SectionRow = memo(function SectionRow({ templateId, section, registerEditorRef, onFocusSection, onDraftChange }: SectionRowProps) {
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

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLabel(e.target.value);
      onDraftChange(section.id, { label: e.target.value });
    },
    [onDraftChange, section.id],
  );
  const handleHtmlChange = useCallback(
    (v: string) => {
      setHtml(v);
      onDraftChange(section.id, { html: v });
    },
    [onDraftChange, section.id],
  );
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
          <Input value={label} onChange={handleLabelChange} className="max-w-60" />
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

export default memo(TemplateFormPage);
