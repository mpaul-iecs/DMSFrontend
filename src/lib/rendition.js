/* Builds a "rendition" from an uploaded file — parse ONCE, store html + css + blocks,
   then render from storage forever.

   Real-world templates rarely use Word header parts: the letterhead, banner and title
   are ordinary body content. So "page chrome" here means the whole template page, and
   a continuation page is a copy of it with the writable areas emptied. */

import { renderAsync } from "docx-preview";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/* Bump when parsing or slot placement changes: renditions are cached in localStorage,
   so an old one keeps its old slot positions until the file is parsed again. */
export const BUILDER_VERSION = 4;

const PDF_MAX_PAGES = 4;       // localStorage caps at ~5 MB
const PT_TO_PX = 96 / 72;      // PDF points → CSS px, so a Letter PDF is 816px like a Letter docx
const RASTER = 1.5;            // render above CSS size for crispness
const EDGE_PAD = 26;
const MIN_BAND = 90;

const pad = (n) => String(n).padStart(3, "0");

/* docx-preview names classes `<className>_<styleId>`, so Word's Title / Subtitle /
   HeadingN all arrive as docx_Title, docx_Subtitle, docx_Heading2 … Matching only
   /heading/i missed Title-styled templates entirely and dumped the slot at the page
   bottom, which is what the first build did. */
const HEADING_RE = /(^|\s)\w+_(title|subtitle|heading\d*)(\s|$)/i;
const isHeading = (el) =>
  /^H[1-6]$/.test(el.tagName) || HEADING_RE.test(el.className || "") || /heading/i.test(el.className || "");

/* ---------------------------------------------------------------- docx */

export async function buildDocxRendition(file) {
  const body = document.createElement("div");
  const styles = document.createElement("div");

  await renderAsync(await file.arrayBuffer(), body, styles, {
    className: "docx",
    inWrapper: true,
    ignoreWidth: false,
    ignoreHeight: false,
    breakPages: true,
    renderHeaders: true,
    renderFooters: true,
    renderFootnotes: true,
    useBase64URL: true,
    experimental: true,        // better tab stops and wrapping; anchored images stay approximate
  });

  const blocks = injectDocxSlots(body);

  return {
    builderVersion: BUILDER_VERSION,
    kind: "docx",
    name: file.name,
    createdAt: new Date().toISOString(),
    css: styles.innerHTML,
    html: body.innerHTML,
    blocks,
  };
}

function injectDocxSlots(root) {
  const created = [];
  const sections = root.querySelectorAll("section.docx");
  const pages = sections.length ? sections : [root];

  pages.forEach((section, pageIdx) => {
    const kids = Array.from(section.children).filter(
      (el) => !el.classList.contains("docx-header") && !el.classList.contains("docx-footer")
    );
    const headingIdx = kids.map((el, i) => (isHeading(el) ? i : -1)).filter((i) => i >= 0);

    if (!headingIdx.length) {
      created.push(placeDocxSlot(section, afterLastContent(kids, 0, kids.length), `Page ${pageIdx + 1}`));
      return;
    }
    for (let h = headingIdx.length - 1; h >= 0; h--) {
      const start = headingIdx[h];
      const end = headingIdx[h + 1] != null ? headingIdx[h + 1] : kids.length;
      const label = kids[start].textContent.trim().slice(0, 60) || `Section ${h + 1}`;
      created.unshift(placeDocxSlot(section, afterLastContent(kids, start, end), label));
    }
  });

  return created.map((b, i) => {
    const el = root.querySelector(`[data-block-key="${b.key}"]`);
    const key = `edit-${pad(i + 1)}`;
    if (el) el.setAttribute("data-block-key", key);
    return { ...b, key, kind: "flow" };
  });
}

/* Word templates are full of empty spacer paragraphs. Appending the slot at the end of
   a section therefore dropped the writing area at the bottom of the page. Instead, find
   the last element in the section that actually carries content and insert right after
   it — directly under the title, where an author expects to type. */
const hasContent = (el) =>
  !!(el.textContent || "").trim() || !!el.querySelector?.("img, table, svg, canvas");

function afterLastContent(kids, start, end) {
  for (let i = end - 1; i >= start; i--) {
    if (hasContent(kids[i])) return kids[i].nextSibling;   // insertBefore(next) === insertAfter(kid)
  }
  return kids[start] ? kids[start].nextSibling : null;
}

function placeDocxSlot(section, beforeEl, label) {
  const slot = document.createElement("div");
  const tmp = `tmp-${Math.random().toString(36).slice(2, 8)}`;
  slot.className = "slot";
  slot.setAttribute("data-block-key", tmp);
  if (beforeEl && beforeEl.parentNode === section) section.insertBefore(slot, beforeEl);
  else section.appendChild(slot);
  return { key: tmp, label, required: false };
}

/* ----------------------------------------------------------------- pdf */

export async function buildPdfRendition(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const count = Math.min(pdf.numPages, PDF_MAX_PAGES);

  const parts = [];
  const blocks = [];

  for (let p = 1; p <= count; p++) {
    const page = await pdf.getPage(p);

    /* CSS size comes from the PDF's own page box, so a Letter PDF renders at the same
       816px as a Letter .docx instead of everything being forced to A4 width. */
    const cssView = page.getViewport({ scale: PT_TO_PX });
    const rasterView = page.getViewport({ scale: PT_TO_PX * RASTER });

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(rasterView.width);
    canvas.height = Math.floor(rasterView.height);
    await page.render({ canvasContext: canvas.getContext("2d"), viewport: rasterView }).promise;

    const W = Math.round(cssView.width), H = Math.round(cssView.height);
    const rect = await findWritableBand(page, cssView, W, H);

    const key = `edit-${pad(p)}`;
    blocks.push({ key, label: `Page ${p}`, required: false, kind: "overlay" });

    parts.push(
      `<div class="pdf-page" style="width:${W}px;height:${H}px">
         <img src="${canvas.toDataURL("image/jpeg", 0.7)}" alt="page ${p}" />
         <div class="slot overlay" data-block-key="${key}"
              style="left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px"></div>
       </div>`
    );
  }

  return {
    builderVersion: BUILDER_VERSION,
    kind: "pdf",
    name: file.name,
    createdAt: new Date().toISOString(),
    css: "",
    html: parts.join("\n"),
    blocks,
    truncated: pdf.numPages > count ? pdf.numPages - count : 0,
  };
}

/* Reads the text layer, works out which horizontal bands are occupied, and returns the
   largest empty band — so the writing area lands under the banner and above the footer.
   Scanned pages have no text layer, so the whole inset area becomes writable. */
async function findWritableBand(page, viewport, W, H) {
  const inset = Math.round(W * 0.09);
  const fallback = { left: inset, top: Math.round(H * 0.18), width: W - inset * 2, height: Math.round(H * 0.7) };

  let items = [];
  try {
    items = (await page.getTextContent()).items || [];
  } catch {
    return fallback;
  }

  const bands = [];
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    const t = it.transform;
    if (!t) continue;
    const [, y] = viewport.convertToViewportPoint(t[4], t[5]);
    const h = Math.max(10, (it.height || 10) * viewport.scale);
    bands.push([y - h * 1.25, y + h * 0.45]);
  }
  if (!bands.length) return fallback;

  bands.sort((a, b) => a[0] - b[0]);
  const merged = [bands[0].slice()];
  for (const [s, e] of bands.slice(1)) {
    const last = merged[merged.length - 1];
    if (s <= last[1] + 8) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }

  const gaps = [];
  let cursor = EDGE_PAD;
  for (const [s, e] of merged) {
    if (s - cursor >= MIN_BAND) gaps.push([cursor, s]);
    cursor = Math.max(cursor, e);
  }
  if (H - EDGE_PAD - cursor >= MIN_BAND) gaps.push([cursor, H - EDGE_PAD]);
  if (!gaps.length) return fallback;

  const [top, bottom] = gaps.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
  return {
    left: inset,
    top: Math.round(top + 12),
    width: W - inset * 2,
    height: Math.round(bottom - top - 20),
  };
}

/* ------------------------------------------------------- add a page */
/* Copies the TEMPLATE PAGE exactly — banner, title, borders, everything — and empties
   only the writable areas. Earlier this kept just .docx-header/.docx-footer and stripped
   the rest, which produced a blank sheet: real templates put their letterhead in the body,
   not in a Word header part. */

export function appendContinuationPage(rendition, templatePageIndex = 0) {
  const host = document.createElement("div");
  host.innerHTML = rendition.html;

  const selector = rendition.kind === "docx" ? "section.docx" : ".pdf-page";
  const pages = host.querySelectorAll(selector);
  if (!pages.length) return null;

  const source = pages[Math.min(templatePageIndex, pages.length - 1)];
  const clone = source.cloneNode(true);

  let n = rendition.blocks.filter((b) => b.key.startsWith("cont-")).length;
  const added = [];

  clone.querySelectorAll("[data-block-key]").forEach((slot) => {
    const key = `cont-${pad(++n)}`;
    slot.setAttribute("data-block-key", key);
    slot.innerHTML = "";
    added.push({
      key,
      label: "Continuation page",
      required: false,
      kind: rendition.kind === "docx" ? "flow" : "overlay",
    });
  });

  if (!added.length) return null;

  const parent = rendition.kind === "docx" ? source.parentNode : host;
  parent.appendChild(clone);

  return { ...rendition, html: host.innerHTML, blocks: [...rendition.blocks, ...added] };
}