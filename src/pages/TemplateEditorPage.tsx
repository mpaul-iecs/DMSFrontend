import { memo, useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import FullPageEditor from "../editor/FullPageEditor";
import type { EditorSectionInput } from "../editor";
import TemplateFieldPanel from "../components/template/TemplateFieldPanel";
import EmptyState from "../components/ui/EmptyState";
import TemplateDetailSkeleton from "../components/template/TemplateDetailSkeleton";
import useAuth from "../hooks/useAuth";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchTemplateByIdThunk, upsertSectionThunk } from "../store/template/templateThunks";
import { clearSelectedTemplate } from "../store/template/templateSlice";
import type { TemplateSectionDto } from "../types/template";

const TEMPLATE_GOVERNANCE_MENU_ID = 724;

function toEditorSections(sections: TemplateSectionDto[]): EditorSectionInput[] {
  return sections.map((s) => ({
    id: s.id,
    kind: s.sectionKind === "header" ? "header" : s.sectionKind === "footer" ? "footer" : "body",
    order: s.sectionOrder,
    html: s.defaultContentHtml,
  }));
}

/**
 * The full-page popup editor's page — opened via `window.open` from TemplateDetailPage.tsx,
 * outside `AppLayout` (no sidebar/header chrome, see routes/AppRoutes.tsx). Unlike every
 * other authenticated route, `MenuGuard` here is effectively a no-op (it can't exact-match
 * this parameterized path against the unfiltered menu catalogue, same as `/profile`/
 * `/settings`), so this page does its own view/edit permission check.
 */
function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const templateId = Number(id);
  const dispatch = useAppDispatch();
  const { canMenu } = useAuth();
  const { selected, selectedLoading } = useAppSelector((s) => s.template);

  useEffect(() => {
    if (!Number.isNaN(templateId)) dispatch(fetchTemplateByIdThunk(templateId));
    return () => {
      dispatch(clearSelectedTemplate());
    };
  }, [dispatch, templateId]);

  const canView = canMenu(TEMPLATE_GOVERNANCE_MENU_ID, "view");
  const canEdit = canMenu(TEMPLATE_GOVERNANCE_MENU_ID, "edit");

  const editorSections = useMemo(() => toEditorSections(selected?.sections ?? []), [selected]);

  const handleSave = useCallback(
    async (changed: { id: number; html: string }[]) => {
      if (!selected) return;
      for (const change of changed) {
        const original = selected.sections.find((s) => s.id === change.id);
        if (!original) continue;
        await dispatch(
          upsertSectionThunk({
            templateId: selected.id,
            payload: {
              id: original.id,
              sectionKind: original.sectionKind,
              sectionKey: original.sectionKey,
              label: original.label,
              titleVisibleInDocument: original.titleVisibleInDocument,
              isTitleLocked: original.isTitleLocked,
              isBodyLocked: original.isBodyLocked,
              isRequired: original.isRequired,
              defaultContentHtml: change.html,
              placeholderText: original.placeholderText,
              sectionOrder: original.sectionOrder,
              pageIndex: original.pageIndex,
              overlayLeft: original.overlayLeft,
              overlayTop: original.overlayTop,
              overlayWidth: original.overlayWidth,
              overlayHeight: original.overlayHeight,
              boundBookmarkTag: original.boundBookmarkTag,
              fields: [],
            },
          }),
        );
      }
    },
    [dispatch, selected],
  );

  if (!canView) {
    return <EmptyState message="You don't have permission to view this template." icon={ShieldOff} />;
  }

  if (selectedLoading || !selected) {
    return <TemplateDetailSkeleton />;
  }

  return (
    <FullPageEditor
      title={`${selected.templateName} · ${selected.versionLabel}`}
      initialSections={editorSections}
      editable={canEdit}
      onSave={handleSave}
      fieldPanel={(insertAtCursor) => (
        <TemplateFieldPanel
          templateVersionId={selected.id}
          placeholderFormat={selected.placeholderFormat}
          onInsert={insertAtCursor}
        />
      )}
    />
  );
}

export default memo(TemplateEditorPage);
