# Backend integration brief — single-document rewrite (2026-09-05)

**Status: already applied.** This describes the current contract between `dms-editor`
(frontend) and `DMSBackendAPI` (backend), both of which were rewritten together in this
change. Kept here as the reference for the next person/agent working on either side —
not a to-do list.

> Superseded: the original version of this doc (2026-09-03) described adding shapes/
> images/find-replace on top of the old per-block "rendition + slots" architecture. That
> architecture is gone. If you're reading an old copy of this file, discard it.

## The new model

A document is **one HTML string**, not a rendition + per-block content map. There is no
template, no locked/editable slot distinction, no header/footer-as-separate-blocks. You
upload a `.docx`, edit it as one free-form document (frontend: `reactjs-tiptap-editor`,
one editor for the whole file — replacing the old hand-built Ribbon/Tiptap/Lexical setup),
and save/submit/approve it like any other file.

- Frontend: `DocumentEditor.jsx` is the whole editor. `App.jsx` holds `html: string` in
  state; no more `content: {blockKey: html}`.
- Backend: `DocumentRecord.Html` (string) replaces `Rendition`/`Blocks`/`Content`.
  `SaveDraftRequest.Html` (string) replaces the per-block dictionary.
- **PDF upload is deferred.** `PdfParser`/`PdfExportService` were moved to
  `DMSBackend/Deferred/*.cs.txt` (excluded from the build) — see the README there for how
  to bring them back. Upload only accepts `.docx` now; the backend rejects anything else
  with `UNSUPPORTED_FILE_TYPE`.
- `POST /api/documents/{id}/pages` (add page) was removed — there's no page/slot concept
  left for it to add to.

## DocxParser — mammoth-style conversion

Rewritten to follow the same approach as mammoth.js (which the frontend's own "Import
Word" toolbar button uses client-side, for a docx dropped into an already-open document):
map each paragraph's **style name** to a semantic HTML tag (`Heading 1` → `h1`, `Quote` →
`blockquote`, default → `p`), carry run-level bold/italic/underline/strike/superscript/
subscript directly, and don't try to reproduce the page's exact visual layout — that's
what the old rendition/blocks system did, and it's gone. Also newly handles (the old
parser didn't): **tables** (`<w:tbl>` → `<table>`), **numbered/bulleted lists** (`w:numPr`
+ the numbering part's format → `<ul>`/`<ol>`), and **hyperlinks** (`<w:hyperlink>` →
`<a href>`). Header and footer paragraphs are now just prepended/appended as regular
content, not separate blocks.

Output vocabulary (must match the sanitizer allow-list below): `p, h1–h6, blockquote,
strong, em, u, s, sup, sub, a, br, ul, ol, li, table, tbody, tr, td, span, img`.

## DocxExportService

Simplified to walk the ONE `record.Html` string (previously iterated blocks + separately
rebuilt header/footer parts + page-break bookkeeping — all gone). Same HTML→OpenXml
converter otherwise, extended for `blockquote` and `a` (rendered as styled text — a true
OOXML hyperlink relationship isn't wired up). Images are still **not** round-tripped on
export (unchanged limitation, documented in the class summary).

## Sanitizer (`Program.cs`)

Allow-list now covers both the parser's output and `reactjs-tiptap-editor`'s richer output
(highlight → `mark`, strike → `s`, blockquote, links, columns/callout → `div` with
`data-type`/`data-callout-type`, superscript/subscript). Current lists:

- Tags: `p h1-h6 blockquote strong em u s sup sub mark a br hr ul ol li table thead tbody tr td th colgroup col span div img`
- Attributes: `style src alt title class colspan rowspan colwidth href target rel data-shape data-border data-type data-callout-type data-color`
- Schemes: `data` (for base64-inlined images), plus Ganss's default `http/https/mailto`
- CSS properties: `font-weight font-style text-decoration text-align color background-color font-size font-family margin-left line-height max-width width height display vertical-align padding border(-*) border-radius`

**Verified working end-to-end** (2026-09-05): upload a real `.docx` → mammoth-style parse
→ sanitize → save draft with new tags (`blockquote`, `mark`, `a`, `sup/sub`, `s`, column
`div`s) → all survive → `/download` regenerates a valid `.docx` with the edited content
(headings, bold, lists) intact. See the `dotnet build` + `curl` transcript in the PR/commit
this doc ships with if you need the exact commands.

## Deliberately not done

- **Image round-trip on export** — still skipped, same as before.
- **Real OOXML hyperlinks on export** — `<a>` becomes styled text, not a clickable link.
- **PDF** — deferred, see `/Deferred`.
- **Comments API** — still frontend-only/in-memory; `ReviewView` now anchors comments
  against the single document instead of per-block, same plain-text-offset approach.
