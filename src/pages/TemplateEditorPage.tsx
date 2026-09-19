import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import FullPageEditor from "../editor/FullPageEditor";
import TemplateFieldPanel from "../components/template/TemplateFieldPanel";
import EmptyState from "../components/ui/EmptyState";
import TemplateEditorSkeleton from "../components/template/TemplateEditorSkeleton";
import useAuth from "../hooks/useAuth";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchTemplateByIdThunk, upsertSectionThunk } from "../store/template/templateThunks";
import { clearSelectedTemplate } from "../store/template/templateSlice";
import { STATUS_LABEL } from "../utilities/templateStatus";
import { toEditorSections } from "../utilities/templateSections";
import useDocumentBranding from "../hooks/useDocumentBranding";
import Images from "../assets";

const TEMPLATE_GOVERNANCE_MENU_ID = 724;

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

  // The skeleton has to outlive the network fetch: constructing the full editor (dozens of
  // extensions) is one long synchronous block, during which the browser can't paint — without
  // this the popup went skeleton → blank → editor. So: (1) once data is in, render ONLY the
  // skeleton for a beat so it's definitely painted, (2) then mount the editor with the skeleton
  // still overlaid, (3) drop the overlay when the editor reports its first painted frame.
  const hasData = !!selected && !selectedLoading;
  const [mountEditor, setMountEditor] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  useEffect(() => {
    if (!hasData) return;
    const timer = setTimeout(() => setMountEditor(true), 60);
    return () => clearTimeout(timer);
  }, [hasData]);
  const handleEditorReady = useCallback(() => setEditorReady(true), []);

  // The popup's own window title + favicon: "DMS EDITOR" (with the document's name once loaded) and the app logo.
  useDocumentBranding(
    selected ? `DMS EDITOR — ${selected.templateName} · ${selected.versionLabel}` : "DMS EDITOR",
    Images.logo,
  );

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
    return <TemplateEditorSkeleton />;
  }

  return (
    <>
      {mountEditor && (
        <FullPageEditor
          title={`${selected.templateName} · ${selected.versionLabel} · ${STATUS_LABEL[selected.status]}`}
          initialSections={editorSections}
          editable={canEdit}
          onSave={handleSave}
          onReady={handleEditorReady}
          fieldPanel={(insertAtCursor) => (
            <TemplateFieldPanel
              templateVersionId={selected.id}
              placeholderFormat={selected.placeholderFormat}
              onInsert={insertAtCursor}
              bare
            />
          )}
        />
      )}
      {!editorReady && (
        <div className="fixed inset-0 z-50">
          <TemplateEditorSkeleton />
        </div>
      )}
    </>
  );
}

export default memo(TemplateEditorPage);
