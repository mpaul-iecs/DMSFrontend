/** Compact document-preview size shared by the template form page's Live preview and the
 * detail page's Document preview so both cards have the same height. Scale is relative to a real
 * A4 sheet (794px wide); the height is one scaled page (1123px x scale) plus the viewport
 * padding, so a single page shows with no scrollbar. Tweak the two together. Users can zoom
 * beyond this with the preview's own zoom buttons. */
export const PREVIEW_MAX_SCALE = 0.34;
export const PREVIEW_MAX_HEIGHT = "25rem";
