import { lazy } from "react";

/** Separate file so its only export is a component (`react-refresh/only-export-components`,
 * same reason as routes/LazyTemplateEditorPage.tsx). `DocumentPreview` drags in the full
 * extension set (Excalidraw/Mermaid/KaTeX), so it must never be imported eagerly. */
const LazyDocumentPreview = lazy(() => import("../../editor/DocumentPreview"));

export default LazyDocumentPreview;
