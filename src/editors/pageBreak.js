import { Node } from "@tiptap/core";

/* Word's "Insert > Page break", reimplemented as a small atomic node since
   reactjs-tiptap-editor doesn't ship one. On screen it renders as a full-bleed grey gap
   (see .page-break in index.css) so a continuously-scrolling document still reads as
   "new sheet starts here" the way Word's own single-scroll view does. On export it maps
   to a real Word page break (DocxExportService: <hr class="page-break"> -> a run with
   <w:br w:type="page"/>), and DocxParser emits the same tag when it meets one in an
   uploaded file, so page breaks round-trip both ways. */
export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: "hr.page-break" }];
  },
  renderHTML() {
    return ["hr", { class: "page-break" }];
  },
  addCommands() {
    return {
      /* Inserted at the END of the paragraph the caret is in, not at the raw caret
         position — insertContent() there would SPLIT that paragraph mid-sentence and
         drag its second half onto the new page along with everything after it, which
         reads as "some of my page-1 text jumped to page 2" the moment the caret wasn't
         sitting exactly at a paragraph boundary. Only text written after the current
         paragraph moves, matching what a toolbar button should do. */
      insertPageBreak:
        () =>
        ({ tr, dispatch, state }) => {
          const endOfBlock = state.selection.$to.end();
          if (dispatch) dispatch(tr.insert(endOfBlock, this.type.create()));
          return true;
        },
    };
  },
});
