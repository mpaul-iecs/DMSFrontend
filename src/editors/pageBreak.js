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
      insertPageBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});
