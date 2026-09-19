import { PAGE_SIZES } from "tiptap-pagination-plus";

/** A4 page geometry + page-gap styling shared by `FullPageEditor` (editable) and
 * `DocumentPreview` (read-only) so the preview lands on exactly the same page breaks as the
 * real editor. Header/footer content and their click handlers are added by each consumer.
 *
 * The library's own default for `pageBreakBackground` is white — it fills BOTH the unused
 * remainder of a short page AND the inter-page gap in one element. Matching it to the canvas
 * background (--color-surface-200, #dde3ec) makes that fill invisible instead of reading as a
 * stray block on short documents; only the thin `pageGapBorderColor` hairline marks the seam.
 * These two are plain JS string options (not CSS), so the hexes are hardcoded — keep in sync
 * with the surface scale (see pagination.css). */
export const A4_PAGINATION_OPTIONS = {
  ...PAGE_SIZES.A4,
  marginTop: 54,
  marginBottom: 54,
  contentMarginTop: 8,
  contentMarginBottom: 8,
  pageGap: 28,
  pageGapBorderColor: "#c7d0dc",
  pageBreakBackground: "#dde3ec",
};

/** Width in px of one A4 page at the library's default DPI (PAGE_SIZES.A4.pageWidth). */
export const A4_PAGE_WIDTH = PAGE_SIZES.A4.pageWidth;
