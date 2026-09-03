import { Extension, Node, mergeAttributes, ReactNodeViewRenderer } from "@tiptap/react"; // @tiptap/react re-exports @tiptap/core
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import Image from "@tiptap/extension-image";
import ImageNV from "./ImageNV";

/* Attributes the ribbon needs that StarterKit does not ship. All hang off existing
   nodes/marks, so the schema stays closed. */

export const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [{
      types: ["textStyle"],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el) => el.style.fontSize || null,
          renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size:${attrs.fontSize}` } : {}),
        },
      },
    }];
  },
});

export const FontFamily = Extension.create({
  name: "fontFamilyLocal",
  addGlobalAttributes() {
    return [{
      types: ["textStyle"],
      attributes: {
        fontFamily: {
          default: null,
          parseHTML: (el) => el.style.fontFamily?.replace(/['"]/g, "") || null,
          renderHTML: (attrs) => (attrs.fontFamily ? { style: `font-family:${attrs.fontFamily}` } : {}),
        },
      },
    }];
  },
});

/* indent: 28px steps.
   borderCss: a full CSS border declaration built by the ribbon, e.g.
     "border-top:2px dashed #333;border-bottom:2px dashed #333"
   Storing the declaration rather than a boolean is what lets Word-style
   per-side / style / width / colour choices survive a save. Mapped back to
   w:pBdr on export. */
export const BlockAttributes = Extension.create({
  name: "blockAttributes",
  addGlobalAttributes() {
    return [{
      types: ["paragraph", "heading"],
      attributes: {
        indent: {
          default: 0,
          parseHTML: (el) => parseInt(el.style.marginLeft || "0", 10) / 28 || 0,
          renderHTML: (attrs) => (attrs.indent ? { style: `margin-left:${attrs.indent * 28}px` } : {}),
        },
        borderCss: {
          default: null,
          parseHTML: (el) => el.getAttribute("data-border") || null,
          renderHTML: (attrs) =>
            attrs.borderCss
              ? { style: `${attrs.borderCss};padding:3px 6px`, "data-border": attrs.borderCss }
              : {},
        },
      },
    }];
  },
});

/* line-height: Word's "Line spacing". Stored as a unitless multiplier inline style so it
   round-trips through the HTML the backend keeps. */
export const LineHeight = Extension.create({
  name: "lineHeight",
  addGlobalAttributes() {
    return [{
      types: ["paragraph", "heading"],
      attributes: {
        lineHeight: {
          default: null,
          parseHTML: (el) => el.style.lineHeight || null,
          renderHTML: (attrs) => (attrs.lineHeight ? { style: `line-height:${attrs.lineHeight}` } : {}),
        },
      },
    }];
  },
});

/* Image with a width attribute so the ribbon / resize handle can size it. allowBase64
   lets an uploaded file be inlined as a data URI — the backend stores one HTML blob per
   block, so there is nowhere else to put the bytes in this prototype. */
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.style.width || el.getAttribute("width") || null,
        renderHTML: (attrs) => (attrs.width ? { style: `width:${attrs.width}` } : {}),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNV);
  },
}).configure({ inline: false, allowBase64: true });

/* Word-style shape / text box: a bordered block you type inside. `shape` picks the
   outline (rectangle / rounded / ellipse); `boxWidth` is a percent set by the ribbon.
   Content is block+, so headings, lists and even tables nest inside — "write within
   the shape". Serialises to a plain <div class="textbox …"> so the backend just stores
   it as part of the block HTML. */
export const TextBox = Node.create({
  name: "textBox",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      shape: {
        default: "rect",
        parseHTML: (el) => el.getAttribute("data-shape") || "rect",
        renderHTML: (attrs) => ({ "data-shape": attrs.shape }),
      },
      boxWidth: {
        default: "60%",
        parseHTML: (el) => el.style.width || "60%",
        renderHTML: (attrs) => (attrs.boxWidth ? { style: `width:${attrs.boxWidth}` } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div.textbox" }];
  },
  renderHTML({ HTMLAttributes }) {
    const shape = HTMLAttributes["data-shape"] || "rect";
    const cls = "textbox" + (shape === "rounded" ? " rounded" : shape === "ellipse" ? " ellipse" : "");
    return ["div", mergeAttributes(HTMLAttributes, { class: cls }), 0];
  },
  addCommands() {
    return {
      insertTextBox: (shape = "rect") => ({ commands }) =>
        commands.insertContent({
          type: this.name,
          attrs: { shape, boxWidth: shape === "ellipse" ? "260px" : "60%" },
          content: [{ type: "paragraph" }],
        }),
      setTextBoxWidth: (w) => ({ commands }) =>
        commands.updateAttributes(this.name, { boxWidth: w || null }),
      setTextBoxShape: (s) => ({ commands }) =>
        commands.updateAttributes(this.name, { shape: s }),
    };
  },
});

/* ---------- Find & Replace ----------
   A ProseMirror plugin keeps the list of matches for the current query as inline
   decorations (highlight all = "find all"), tracks which match is current, and exposes
   commands the ribbon calls: setSearch / searchGo / replaceCurrent / replaceAllMatches.
   Works on one editor (the section the ribbon is driving) — matching Word, where Find
   scans the active document. */
const searchKey = new PluginKey("findReplace");

function findMatches(doc, query, opts = {}) {
  const out = [];
  if (!query) return out;
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let re;
  try {
    re = new RegExp(opts.wholeWord ? `\\b${esc}\\b` : esc, opts.caseSensitive ? "g" : "gi");
  } catch {
    return out;
  }
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(node.text))) {
      out.push({ from: pos + m.index, to: pos + m.index + m[0].length });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  });
  return out;
}

function buildDeco(doc, matches, index) {
  return DecorationSet.create(
    doc,
    matches.map((m, i) =>
      Decoration.inline(m.from, m.to, { class: i === index ? "search-cur" : "search-hit" })),
  );
}

export function getSearchInfo(editor) {
  try {
    const s = searchKey.getState(editor.state);
    return { count: s.matches.length, index: s.matches.length ? s.index + 1 : 0 };
  } catch {
    return { count: 0, index: 0 };
  }
}

export const SearchHighlight = Extension.create({
  name: "searchHighlight",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: searchKey,
        state: {
          init: () => ({ query: "", opts: {}, matches: [], index: 0, deco: DecorationSet.empty }),
          apply(tr, value) {
            const meta = tr.getMeta(searchKey);
            let next = meta ? { ...value, ...meta } : value;
            if (meta || tr.docChanged) {
              const matches = findMatches(tr.doc, next.query, next.opts);
              const index = matches.length ? Math.max(0, Math.min(next.index, matches.length - 1)) : 0;
              next = { ...next, matches, index, deco: buildDeco(tr.doc, matches, index) };
            } else if (value.deco !== DecorationSet.empty) {
              next = { ...next, deco: value.deco.map(tr.mapping, tr.doc) };
            }
            return next;
          },
        },
        props: { decorations: (state) => searchKey.getState(state).deco },
      }),
    ];
  },
  addCommands() {
    return {
      setSearch: (query, opts = {}) => ({ tr, dispatch }) => {
        if (dispatch) dispatch(tr.setMeta(searchKey, { query, opts, index: 0 }));
        return true;
      },
      clearSearch: () => ({ tr, dispatch }) => {
        if (dispatch) dispatch(tr.setMeta(searchKey, { query: "", opts: {}, index: 0 }));
        return true;
      },
      searchGo: (dir = 1) => ({ tr, state, dispatch }) => {
        const s = searchKey.getState(state);
        if (!s.matches.length) return false;
        const i = (s.index + dir + s.matches.length) % s.matches.length;
        const m = s.matches[i];
        if (dispatch) {
          dispatch(
            tr.setSelection(TextSelection.create(tr.doc, m.from, m.to))
              .scrollIntoView()
              .setMeta(searchKey, { index: i }),
          );
        }
        return true;
      },
      replaceCurrent: (repl) => ({ tr, state, dispatch }) => {
        const s = searchKey.getState(state);
        const m = s.matches[s.index];
        if (!m) return false;
        if (dispatch) dispatch(tr.insertText(repl ?? "", m.from, m.to));
        return true;
      },
      replaceAllMatches: (repl) => ({ tr, state, dispatch }) => {
        const s = searchKey.getState(state);
        if (!s.matches.length) return false;
        if (dispatch) {
          [...s.matches].reverse().forEach((m) => tr.insertText(repl ?? "", m.from, m.to));
          dispatch(tr);
        }
        return true;
      },
    };
  },
});

/* Table rows carry no height attribute in Tiptap, so the bottom resize handle would
   have nothing to write to. This adds one, rendered as an inline style. */
export const TableRowHeight = Extension.create({
  name: "tableRowHeight",
  addGlobalAttributes() {
    return [{
      types: ["tableRow"],
      attributes: {
        rowHeight: {
          default: null,
          parseHTML: (el) => parseInt(el.style.height || "0", 10) || null,
          renderHTML: (attrs) => (attrs.rowHeight ? { style: `height:${attrs.rowHeight}px` } : {}),
        },
      },
    }];
  },
});