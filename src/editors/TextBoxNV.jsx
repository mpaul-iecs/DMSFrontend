import React, { useRef } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";

/* Shape / text box node view: a bordered box you type inside, with a right-edge drag
   handle that writes the width back to the node (so it survives re-render, unlike CSS
   `resize`). Outline style comes from the `shape` attr. */
export default function TextBoxNV({ node, updateAttributes, selected }) {
  const wrapRef = useRef(null);

  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const wrap = wrapRef.current;
    const box = wrap?.parentElement;
    if (!wrap || !box) return;
    const startX = e.clientX;
    const startW = wrap.offsetWidth;
    const parentW = box.offsetWidth || startW;

    const onMove = (ev) => {
      const next = Math.max(90, startW + (ev.clientX - startX));
      const pct = Math.max(10, Math.min(100, Math.round((next / parentW) * 100)));
      updateAttributes({ boxWidth: pct + "%" });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const shape = node.attrs.shape || "rect";
  const cls =
    "textbox textbox-nv" +
    (shape === "rounded" ? " rounded" : shape === "ellipse" ? " ellipse" : "") +
    (selected ? " sel" : "");

  return (
    <NodeViewWrapper ref={wrapRef} className={cls} style={{ width: node.attrs.boxWidth || "60%" }}>
      <span className="nv-drag" data-drag-handle contentEditable={false} title="Drag to move">⠿</span>
      <NodeViewContent className="textbox-body" />
      <span className="tb-grip" contentEditable={false} onMouseDown={startResize} />
    </NodeViewWrapper>
  );
}
