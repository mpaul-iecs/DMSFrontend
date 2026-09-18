import { lazy } from "react";

/** Split into its own file (rather than declared inline in AppRoutes.tsx) so this file's
 * only export is a component — AppRoutes.tsx's default export is a router instance, not a
 * component, and mixing the two in one file trips `react-refresh/only-export-components`. */
const TemplateEditorPage = lazy(() => import("../pages/TemplateEditorPage"));

export default TemplateEditorPage;
