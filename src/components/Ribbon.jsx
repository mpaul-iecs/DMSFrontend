import React, { useEffect, useRef, useState } from "react";
import { useEditorRegistry } from "../lib/editorRegistry";

const FONTS = ["Times New Roman", "Georgia", "Arial", "Calibri", "Verdana", "Courier New"];
const SIZES = [9, 10, 11, 12, 13, 14, 16, 18, 22, 28];
const HILITES = ["#fde68a", "#bbf7d0", "#bfdbfe", "#fbcfe8", null];
const TABS = ["Home", "Insert", "Layout", "Review", "View"];
const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const stop = (e) => e.preventDefault();          // keep focus in the editor

function Group({ label, wide, children }) {
  return (
    <div className={"rb-group" + (wide ? " wide" : "")}>
      <div className="rb-group-row">{children}</div>
      <div className="rb-group-label">{label}</div>
    </div>
  );
}

function Btn({ api, onClick, title, active, children }) {
  return (
    <button className={active ? "on" : ""} title={title} disabled={!api}
      onMouseDown={stop} onClick={onClick}>{children}</button>
  );
}

/* One ribbon for both engines, styled after Word's blue tabbed ribbon. It drives whichever
   slot was focused last through the adapter that slot registered, so switching
   Tiptap <-> Lexical changes nothing up here.

   Only commands that already exist on the slot adapters are wired. Tabs that would
   otherwise be empty carry a short note about what is not built yet, rather than a row
   of dead buttons. */

export default function Ribbon({ zoom = "fit", setZoom }) {
  const reg = useEditorRegistry();
  const api = reg?.active?.api;
  const [tab, setTab] = useState("Home");

  const zoomNum = zoom === "fit" ? 1 : Number(zoom) || 1;
  const stepZoom = (dir) => {
    const i = ZOOMS.findIndex((z) => z >= zoomNum - 0.001);
    const next = ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, (i < 0 ? 2 : i) + dir))];
    setZoom?.(String(next));
  };

  const run = (fn) => (e) => { stop(e); if (api) fn(); };
  const is = (name, attrs) => !!api?.isActive?.(name, attrs);

  return (
    <div className="ribbon">
      <div className="rb-head">
        {/* Quick access — always visible, like Word's title-bar strip */}
        <div className="rb-qat">
          <button title="Undo" disabled={!api} onMouseDown={stop} onClick={run(() => api.undo())}>↶</button>
          <button title="Redo" disabled={!api} onMouseDown={stop} onClick={run(() => api.redo())}>↷</button>
        </div>

        <div className="rb-tabs">
          {TABS.map((t) => (
            <button key={t} className={"rb-tab" + (t === tab ? " active" : "")}
              onMouseDown={stop} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        <span className="hint">
          {reg?.active
            ? <>Editing <b>{reg.active.key}</b> · {reg.active.engine}</>
            : "Click inside a content area to start writing"}
        </span>
      </div>

      <div className="rb-surface">
        {tab === "Home" && (
          <>
            <Group label="Font" wide>
              {/* selects must NOT preventDefault on mousedown or the native dropdown never opens */}
              <select disabled={!api} defaultValue=""
                onChange={(e) => { api?.fontFamily(e.target.value); e.target.blur(); }}>
                <option value="" disabled>Font</option>
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <select disabled={!api} defaultValue=""
                onChange={(e) => { api?.fontSize(e.target.value); e.target.blur(); }}>
                <option value="" disabled>Size</option>
                {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="sep" />
              <Btn api={api} title="Bold" active={is("bold")} onClick={run(() => api.bold())}><b>B</b></Btn>
              <Btn api={api} title="Italic" active={is("italic")} onClick={run(() => api.italic())}><i>I</i></Btn>
              <Btn api={api} title="Underline" active={is("underline")} onClick={run(() => api.underline())}><u>U</u></Btn>
              <label className="colorwrap" title="Font colour" onMouseDown={stop}>
                <span style={{ fontWeight: 700 }}>A</span>
                <input type="color" defaultValue="#c0392b" disabled={!api}
                  onChange={(e) => api?.color(e.target.value)} />
              </label>
              <span className="swatches" onMouseDown={stop} title="Highlight">
                {HILITES.map((c, i) => (
                  <button key={i} className="sw" disabled={!api}
                    style={{ background: c || "#fff", borderColor: c ? "#c9d0da" : "#96233f" }}
                    onMouseDown={stop} onClick={() => api?.highlight(c)} />
                ))}
              </span>
              <span className="sep" />
              <Btn api={api} title="Clear formatting" onClick={run(() => api.clear())}>⌫</Btn>
            </Group>

            <Group label="Paragraph" wide>
              <Btn api={api} title="Bullets" active={is("bulletList")} onClick={run(() => api.bullet())}>•</Btn>
              <Btn api={api} title="Numbering" active={is("orderedList")} onClick={run(() => api.ordered())}>1.</Btn>
              <Btn api={api} title="Decrease indent" onClick={run(() => api.indent(-1))}>⇤</Btn>
              <Btn api={api} title="Increase indent" onClick={run(() => api.indent(1))}>⇥</Btn>
              <span className="sep" />
              <Btn api={api} title="Align left" active={is({ textAlign: "left" })} onClick={run(() => api.align("left"))}>⯇</Btn>
              <Btn api={api} title="Centre" active={is({ textAlign: "center" })} onClick={run(() => api.align("center"))}>≡</Btn>
              <Btn api={api} title="Align right" active={is({ textAlign: "right" })} onClick={run(() => api.align("right"))}>⯈</Btn>
              <Btn api={api} title="Justify" active={is({ textAlign: "justify" })} onClick={run(() => api.align("justify"))}>▤</Btn>
            </Group>

            <Group label="Styles">
              <Btn api={api} title="Normal text" onClick={run(() => api.paragraph())}>¶</Btn>
              <Btn api={api} title="Heading" active={is("heading", { level: 3 })} onClick={run(() => api.heading())}>H</Btn>
            </Group>
          </>
        )}

        {tab === "Insert" && (
          <>
            <Group label="Tables">
              <TableMenu api={api} />
            </Group>
            <Group label="Illustrations">
              <ImageMenu api={api} />
              <ShapeMenu api={api} />
            </Group>
            <Group label="Symbols">
              <Btn api={api} title="Horizontal line" onClick={run(() => api.hr())}>―</Btn>
            </Group>
            <div className="rb-note">
              Tables: drag the edge handles or column dividers to resize. Images: click to
              select, then drag the corner handle. Shapes: type inside; drag the right edge
              to resize. Hyperlinks and page breaks aren't wired yet.
            </div>
          </>
        )}

        {tab === "Layout" && (
          <>
            <Group label="Paragraph">
              <Btn api={api} title="Decrease indent" onClick={run(() => api.indent(-1))}>⇤</Btn>
              <Btn api={api} title="Increase indent" onClick={run(() => api.indent(1))}>⇥</Btn>
            </Group>
            <Group label="Line spacing">
              <select disabled={!api} value={api?.currentLineSpacing?.() || ""}
                onChange={(e) => { api?.lineSpacing(e.target.value); e.target.blur(); }}>
                <option value="">Single</option>
                {["1.15", "1.5", "2", "2.5", "3"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Group>
            <Group label="Borders &amp; shading">
              <BorderMenu api={api} />
            </Group>
            <Group label="Arrange">
              <Btn api={api} title="Move block up" onClick={run(() => api.moveBlock(-1))}>↑</Btn>
              <Btn api={api} title="Move block down" onClick={run(() => api.moveBlock(1))}>↓</Btn>
            </Group>
            <div className="rb-note">
              Page size, margins and orientation come from the uploaded template and can't
              be changed here.
            </div>
          </>
        )}

        {tab === "Review" && (
          <>
            <Group label="Proofing">
              <Btn api={api} title="Clear formatting" onClick={run(() => api.clear())}>⌫</Btn>
            </Group>
            <div className="rb-note">
              Spell-check is your browser's (right-click a word). Switch to <b>Admin review</b>
              in the top bar to add comments and request changes; track changes isn't wired yet.
            </div>
          </>
        )}

        {tab === "View" && (
          <>
            <Group label="Zoom">
              <button onMouseDown={stop} title="Zoom out" onClick={() => stepZoom(-1)}>−</button>
              <span className="rb-zoom">{zoom === "fit" ? "Fit" : Math.round(zoomNum * 100) + "%"}</span>
              <button onMouseDown={stop} title="Zoom in" onClick={() => stepZoom(1)}>+</button>
              <button onMouseDown={stop} onClick={() => setZoom?.("fit")}
                title="Fit width" style={{ fontSize: 12, padding: "0 8px" }}>Fit</button>
            </Group>
            <Group label="Find &amp; replace">
              <FindReplace api={api} />
            </Group>
            <div className="rb-note">
              Find highlights every match; Replace All acts on the section you're editing.
              Document outline and full-screen aren't wired yet.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/* Find & Replace over the section the ribbon is driving. Highlights every match
   (find all), steps through them, and replaces one or all. Backed by the
   SearchHighlight ProseMirror plugin in tiptapExtensions. */
function FindReplace({ api }) {
  const { open, setOpen, ref } = useDropdown();
  const [q, setQ] = useState("");
  const [r, setR] = useState("");
  const [cs, setCs] = useState(false);
  const [ww, setWw] = useState(false);
  const [info, setInfo] = useState({ count: 0, index: 0 });

  const push = (query = q) => api?.search?.(query, { caseSensitive: cs, wholeWord: ww });
  const refresh = () => setInfo(api?.searchInfo?.() || { count: 0, index: 0 });

  useEffect(() => {
    if (!open) { api?.searchClear?.(); return; }
    push();
    const id = setInterval(refresh, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [open, cs, ww]);

  return (
    <span className="dd" ref={ref}>
      <button disabled={!api} title="Find & replace" onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}>🔍<span className="caret">▾</span></button>

      {open && (
        <div className="dd-panel wide" onMouseDown={panelMouseDown}>
          <div className="dd-title">Find &amp; replace</div>

          <label className="dd-row">
            <span>Find</span>
            <input type="text" value={q} style={{ width: 140 }}
              onChange={(e) => { setQ(e.target.value); push(e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Enter") { api?.searchNext?.(); refresh(); } }} />
          </label>
          <label className="dd-row">
            <span>Replace</span>
            <input type="text" value={r} style={{ width: 140 }}
              onChange={(e) => setR(e.target.value)} />
          </label>

          <label className="dd-row"><span>Match case</span>
            <input type="checkbox" checked={cs} onChange={(e) => setCs(e.target.checked)} /></label>
          <label className="dd-row"><span>Whole word</span>
            <input type="checkbox" checked={ww} onChange={(e) => setWw(e.target.checked)} /></label>

          <div className="dd-note">{info.count ? `${info.index} of ${info.count}` : "No matches"}</div>

          <div className="dd-grid-actions" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <button disabled={!info.count} onClick={() => { api?.searchPrev?.(); refresh(); }}>Previous</button>
            <button disabled={!info.count} onClick={() => { api?.searchNext?.(); refresh(); }}>Next</button>
            <button disabled={!info.count} onClick={() => { api?.replaceOne?.(r); refresh(); }}>Replace</button>
            <button disabled={!info.count} onClick={() => { api?.replaceAll?.(r); refresh(); }}>Replace all</button>
          </div>
        </div>
      )}
    </span>
  );
}

/* Word-style shape / text box. Insert a rectangle, rounded box or ellipse you can type
   inside; drag its right edge to resize (CSS resize). The width buttons set it precisely. */
function ShapeMenu({ api }) {
  const { open, setOpen, ref } = useDropdown();
  const inShape = !!api?.inShape?.();
  return (
    <span className="dd" ref={ref}>
      <button disabled={!api} title="Shape / text box" onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}>▭<span className="caret">▾</span></button>

      {open && (
        <div className="dd-panel wide" onMouseDown={panelMouseDown}>
          <div className="dd-title">Insert shape (type inside it)</div>
          <div className="dd-grid-actions">
            <button onClick={() => { api?.shape("rect"); setOpen(false); }}>Rectangle</button>
            <button onClick={() => { api?.shape("rounded"); setOpen(false); }}>Rounded</button>
            <button onClick={() => { api?.shape("ellipse"); setOpen(false); }}>Ellipse</button>
          </div>

          <div className="dd-title" style={{ marginTop: 10 }}>Selected shape</div>
          <div className="dd-grid-actions">
            {["30%", "50%", "70%", "100%"].map((w) => (
              <button key={w} disabled={!inShape}
                onClick={() => { api?.shapeWidth(w); setOpen(false); }}>{w}</button>
            ))}
          </div>
          <div className="dd-grid-actions" style={{ marginTop: 4 }}>
            {[["rect", "Square edge"], ["rounded", "Rounded"], ["ellipse", "Ellipse"]].map(([s, l]) => (
              <button key={s} disabled={!inShape}
                onClick={() => { api?.shapeKind(s); setOpen(false); }}>{l}</button>
            ))}
          </div>
          {!inShape && <div className="dd-note">Put the caret inside a shape to restyle it.</div>}
        </div>
      )}
    </span>
  );
}

/* Insert / resize an image. URL or file upload (inlined as a data URI — the backend
   keeps one HTML blob per block, so there is nowhere else for the bytes). Width buttons
   appear once an image is selected. */
function ImageMenu({ api }) {
  const { open, setOpen, ref } = useDropdown();
  const [url, setUrl] = useState("");
  const fileRef = useRef(null);
  const inImage = !!api?.inImage?.();

  const pick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { api?.image(String(r.result), f.name); setOpen(false); };
    r.readAsDataURL(f);
    e.target.value = "";
  };

  return (
    <span className="dd" ref={ref}>
      <button disabled={!api} title="Image" onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}>▧<span className="caret">▾</span></button>

      {open && (
        <div className="dd-panel wide" onMouseDown={panelMouseDown}>
          <div className="dd-title">Insert image</div>

          <button className="apply" style={{ width: "100%", height: 28 }}
            onClick={() => fileRef.current?.click()}>Upload from computer…</button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />

          <label className="dd-row" style={{ marginTop: 10 }}>
            <span>URL</span>
            <input type="text" value={url} placeholder="https://…"
              onChange={(e) => setUrl(e.target.value)} style={{ width: 130 }} />
          </label>
          <div className="dd-actions">
            <button className="apply"
              onClick={() => { if (url) { api?.image(url); setUrl(""); setOpen(false); } }}>Insert URL</button>
          </div>

          <div className="dd-title" style={{ marginTop: 10 }}>Selected image width</div>
          <div className="dd-grid-actions">
            {["25%", "50%", "75%", "100%", "auto"].map((w) => (
              <button key={w} disabled={!inImage}
                onClick={() => { api?.imageWidth(w === "auto" ? null : w); setOpen(false); }}>{w}</button>
            ))}
          </div>
          {!inImage && <div className="dd-note">Select an image first to change its width.</div>}
        </div>
      )}
    </span>
  );
}

const panelMouseDown = (e) => {
  /* Keeping focus in the editor needs preventDefault, but doing it on the whole panel
     also stops native <select> dropdowns from opening — which is why Style and Width
     appeared dead. Let form controls through. */
  if (!/^(SELECT|OPTION|INPUT|TEXTAREA)$/.test(e.target.tagName)) e.preventDefault();
};

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return { open, setOpen, ref };
}

/* Word-style border builder: pick sides, style, width and colour. The result is a CSS
   declaration stored on the block, which maps to w:pBdr when this becomes real. */
function BorderMenu({ api }) {
  const { open, setOpen, ref } = useDropdown();
  const [sides, setSides] = useState({ top: true, right: true, bottom: true, left: true });
  /* Defaults are hairline grey rather than 1px near-black — the old default read as a
     heavy box at page zoom. Anything heavier is a deliberate choice now. */
  const [style, setStyle] = useState("solid");
  const [width, setWidth] = useState(0.5);
  const [color, setColor] = useState("#9aa3b2");

  const toggle = (s) => setSides((v) => ({ ...v, [s]: !v[s] }));
  const build = () => {
    const active = Object.entries(sides).filter(([, on]) => on).map(([s]) => s);
    if (!active.length) return null;
    if (active.length === 4) return `border:${width}px ${style} ${color}`;
    return active.map((s) => `border-${s}:${width}px ${style} ${color}`).join(";");
  };

  return (
    <span className="dd" ref={ref}>
      <button disabled={!api} title="Borders" onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}>▢<span className="caret">▾</span></button>

      {open && (
        <div className="dd-panel" onMouseDown={panelMouseDown}>
          <div className="dd-title">Borders</div>

          <div className="side-grid">
            {["top", "left", "right", "bottom"].map((s) => (
              <button key={s} className={"side " + s + (sides[s] ? " on" : "")}
                onClick={() => toggle(s)}>{s[0].toUpperCase()}</button>
            ))}
            <span className="side-box" />
          </div>

          <label className="dd-row">
            <span>Style</span>
            <select value={style} onChange={(e) => setStyle(e.target.value)}>
              {["solid", "dashed", "dotted", "double", "groove"].map((v) => <option key={v}>{v}</option>)}
            </select>
          </label>

          <label className="dd-row">
            <span>Width</span>
            <select value={width} onChange={(e) => setWidth(+e.target.value)}>
              {[0.5, 0.75, 1, 1.5, 2, 3, 4].map((v) => <option key={v} value={v}>{v} px</option>)}
            </select>
          </label>

          <label className="dd-row">
            <span>Colour</span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>

          <div className="dd-preview" style={previewStyle(sides, style, width, color)}>Preview</div>

          <div className="dd-actions">
            <button className="ghost" onClick={() => { api?.border(null); setOpen(false); }}>None</button>
            <button className="apply" onClick={() => { api?.border(build()); setOpen(false); }}>Apply</button>
          </div>
        </div>
      )}
    </span>
  );
}

function previewStyle(sides, style, width, color) {
  const out = {};
  ["top", "right", "bottom", "left"].forEach((s) => {
    const k = "border" + s[0].toUpperCase() + s.slice(1);
    out[k] = sides[s] ? `${width}px ${style} ${color}` : "none";
  });
  return out;
}

/* Word-style grid picker: hover to size the table, click to insert. Row and column
   controls appear once the caret is inside a table. */
function TableMenu({ api }) {
  const { open, setOpen, ref } = useDropdown();
  const [hover, setHover] = useState({ r: 0, c: 0 });
  const [header, setHeader] = useState(true);
  const MAX_R = 8, MAX_C = 8;
  const inTable = !!api?.inTable?.();

  return (
    <span className="dd" ref={ref}>
      <button disabled={!api} title="Table" onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}>▦<span className="caret">▾</span></button>

      {open && (
        <div className="dd-panel wide" onMouseDown={panelMouseDown}>
          <div className="dd-title">
            Insert table {hover.r ? `— ${hover.r} × ${hover.c}` : ""}
          </div>

          <div className="grid-pick" onMouseLeave={() => setHover({ r: 0, c: 0 })}>
            {Array.from({ length: MAX_R }).map((_, r) => (
              <div className="grid-row" key={r}>
                {Array.from({ length: MAX_C }).map((_, c) => (
                  <span key={c}
                    className={"cell" + (r < hover.r && c < hover.c ? " on" : "")}
                    onMouseEnter={() => setHover({ r: r + 1, c: c + 1 })}
                    onClick={() => { api?.table(r + 1, c + 1, header); setOpen(false); }} />
                ))}
              </div>
            ))}
          </div>

          <label className="dd-row">
            <span>Header row</span>
            <input type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} />
          </label>

          <div className="dd-title" style={{ marginTop: 8 }}>Edit table</div>
          <div className="dd-grid-actions">
            {[
              ["rowBefore", "Row above"], ["rowAfter", "Row below"], ["delRow", "Delete row"],
              ["colBefore", "Col left"], ["colAfter", "Col right"], ["delCol", "Delete col"],
              ["headerRow", "Header row"], ["merge", "Merge / split"], ["delTable", "Delete table"],
            ].map(([op, label]) => (
              <button key={op} disabled={!inTable}
                onClick={() => { api?.tableOp?.(op); setOpen(false); }}>{label}</button>
            ))}
          </div>
          {!inTable
            ? <div className="dd-note">Put the caret inside a table to enable these.</div>
            : <div className="dd-note">
                Drag a column edge to resize (Tiptap). Header row and merge are Tiptap-only —
                <code>@lexical/table</code> has no stable public API for them.
              </div>}
        </div>
      )}
    </span>
  );
}
