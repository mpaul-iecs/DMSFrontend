# Backend integration brief — editor feature additions

**Audience:** a terminal coding agent (or you) working in `d:\DMSBackend\DMSBackendAPI`.
**Source of truth for the frontend:** `d:\dms-editor` (Tiptap editor + shared ribbon).
**Date:** 2026-09-03

The frontend editor gained: images (upload + URL, resizable), horizontal rules,
Word-style **text boxes / shapes** (type inside them), **line spacing**, find & replace,
drag-to-move for images/shapes. Everything still round-trips as **one HTML string per
block** through `PUT /api/documents/{id}/draft` — no new endpoints, no schema changes.

But the HTML now contains tags / attributes / CSS the server sanitizer currently
**strips on save**, which silently deletes the user's content (most visibly: shapes
vanish after a reload). This brief lists exactly what to allow.

---

## 1. What the editor now emits (HTML vocabulary)

| Feature | Serialised HTML | New vs. current allow-list |
|---|---|---|
| Image | `<img src="…" alt="…" title="…" style="width:45%">` — `src` may be `data:image/png;base64,…` from an uploaded file | `title` attr new; `data:` scheme already allowed; `width` already allowed |
| Horizontal rule | `<hr>` | `hr` tag **missing** |
| Text box / shape | `<div class="textbox" data-shape="rounded" style="width:60%"><p>…</p></div>` — `class` is `textbox`, `textbox rounded`, or `textbox ellipse`; contains block content (`p`, `h1`–`h6`, `ul`, `table`, …) | `div` tag **missing**, `class` attr **missing**, `data-shape` attr **missing** |
| Line spacing | `<p style="line-height:1.5">` / `<h2 style="line-height:2">` | `line-height` CSS **missing** |
| Highlight (already shipped) | `<mark>…</mark>` | `mark` tag **missing** — highlight is being lost today |
| Strikethrough (already shipped) | `<s>…</s>` | `s` tag **missing** |
| Paragraph border / shading (already shipped) | `<p data-border="border:0.5px solid #9aa3b2" style="border:0.5px solid #9aa3b2;padding:3px 6px">` | `data-border` attr + `border*` / `padding` CSS **missing** — borders are being lost today |
| Table column width (already shipped) | Tiptap resizable tables emit `<colgroup><col style="width:120px"></colgroup>` and/or `<td colwidth="120">` | `colgroup`, `col` tags + `colwidth` attr **missing** — column resizing does not persist |
| Table cell merge | `<td colspan="2" rowspan="1">` | `colspan`, `rowspan` attrs **missing** |
| Table row height (already shipped) | `<tr style="height:32px">` | `height` CSS already allowed |

---

## 2. Required change — `Program.cs` sanitizer

File: `d:\DMSBackend\DMSBackendAPI\Program.cs`, the
`builder.Services.AddSingleton(_ => { var sanitizer = new HtmlSanitizer(); … })` block
(~line 50). Apply these additions:

```csharp
var sanitizer = new HtmlSanitizer();
sanitizer.AllowedTags.Clear();
foreach (var tag in new[]
{
    "p", "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "em", "u", "s", "mark", "br",
    "ul", "ol", "li",
    "table", "thead", "tbody", "tr", "td", "th", "colgroup", "col",
    "span", "div", "img", "hr",            // + div, img already there, hr, colgroup/col
})
    sanitizer.AllowedTags.Add(tag);

sanitizer.AllowedAttributes.Clear();
foreach (var attr in new[]
{
    "style", "src", "alt", "title", "class",
    "colspan", "rowspan", "colwidth",       // table structure
    "data-shape", "data-border",            // editor round-trip attrs
})
    sanitizer.AllowedAttributes.Add(attr);

sanitizer.AllowedSchemes.Add("data");       // unchanged — keeps base64 image uploads

sanitizer.AllowedCssProperties.Clear();
foreach (var prop in new[]
{
    "font-weight", "font-style", "text-decoration", "text-align",
    "color", "background-color", "font-size", "font-family",
    "margin-left", "line-height",
    "max-width", "width", "height", "display", "vertical-align",
    "padding",
    "border", "border-top", "border-right", "border-bottom", "border-left",
    "border-width", "border-style", "border-color", "border-radius",
})
    sanitizer.AllowedCssProperties.Add(prop);
```

Notes:
- `HtmlSanitizer` (Ganss) 9.x accepts arbitrary names in `AllowedAttributes`, including
  `data-*`. Alternatively set `sanitizer.AllowDataAttributes = true` and drop the two
  `data-` entries.
- Allowing `div` + `class` widens the surface slightly. It is still allow-list only —
  no `script`, `iframe`, event handlers, or unknown tags. Acceptable for an internal DMS.
  If you want to be stricter, post-process: keep `<div>` only when `class` starts with
  `textbox`.
- `data:` URIs for images already pass (`AllowedSchemes` has `data`). No size cap in the
  sanitizer; the 60 MB Kestrel / `[RequestSizeLimit]` cap (Program.cs line ~74,
  DocumentsController line ~57) already covers a base64 photo.

**Verification:** round-trip this through `_sanitizer.Sanitize(...)` in a unit test and
assert nothing is dropped:

```html
<div class="textbox" data-shape="rounded" style="width:60%"><p style="line-height:1.5">Hi</p></div>
<hr>
<p><mark>marked</mark> <s>struck</s></p>
<p data-border="border:1px solid #333" style="border:1px solid #333;padding:3px 6px">bordered</p>
<table><colgroup><col style="width:120px"></colgroup><tbody><tr style="height:30px"><td colspan="2">x</td></tr></tbody></table>
<img src="data:image/png;base64,iVBORw0KGgo=" alt="x" style="width:40%">
```

---

## 3. Optional — image storage

Base64 uploads work as-is but bloat every draft payload and the stored JSON
(`JsonDocumentRepository`). If image use grows, add a real upload endpoint and have the
frontend send a URL instead of a data URI:

- `POST /api/documents/{id}/images` (multipart) → save under `App_Data/files/{id}/…` →
  return `{ url }`.
- Serve `App_Data/files` as static content (or a `GET .../images/{name}` action).
- Frontend change: in `d:\dms-editor\src\components\Ribbon.jsx` `ImageMenu.pick`, POST the
  file and call `api.image(url)` with the returned URL instead of the FileReader data URI.

Not required for correctness — only for payload size.

---

## 4. Optional — DOCX export (`Export/DocxExportService.cs`)

The exporter is explicitly best-effort and **already skips `<img>`**. New constructs it
does not yet handle: `<hr>`, `<div class="textbox">`, `line-height`. Until addressed, an
exported/downloaded `.docx` will:
- drop images (already the case),
- drop horizontal rules,
- render a text box's inner content as plain paragraphs (acceptable), losing the box
  outline,
- ignore line spacing.

If you want these in export, the mapping is:
- `<hr>` → a paragraph with a bottom border (`ParagraphBorders` / `Bar`), or a thin table.
- `<div class="textbox">` → a single-cell `Table` with `TableBorders`, recurse into its
  children for the cell content; `data-shape="ellipse"` has no clean Word equivalent —
  fall back to a rounded/plain box.
- `line-height:x` → `SpacingBetweenLines { Line = (x*240).ToString(), LineRule = Auto }`
  on the paragraph.
- `<img>` → `Drawing` + `ImagePart`; needs the bytes (decode the `data:` URI or fetch the
  URL) — this is the big one the current code punts on.

Screen rendering (view / review / the SPA) does **not** use this exporter — it renders the
stored HTML directly — so this only affects the Download button.

---

## 5. Nothing else changes

- `PUT /api/documents/{id}/draft` contract, `SaveDraftRequest`, per-block key validation
  (DocumentsController ~line 128) — unchanged.
- `DocumentRecord`, repository, versioning, submit/approve workflow — unchanged.
- Comment anchoring (plain-text offsets) — unchanged. `<img>` / `<hr>` contribute zero
  text length, so existing anchors stay valid; a comment range that visually spans an
  image simply won't include the image node. No action needed.

---

## 6. How to drive this from a terminal

From the backend repo:

```
cd d:\DMSBackend\DMSBackendAPI
claude "Read d:\dms-editor\docs\backend-integration.md and apply section 2 (the sanitizer
        allow-list changes in Program.cs). Then add an xUnit test that round-trips the
        HTML sample in section 2 through the configured HtmlSanitizer and asserts no tags,
        attributes or CSS properties are stripped."
```

Sections 3 and 4 are optional follow-ups — mention them explicitly if you want them done.
