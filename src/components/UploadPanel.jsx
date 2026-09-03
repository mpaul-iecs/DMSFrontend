import React, { useRef, useState } from "react";

const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/* Parsing moved to the backend (OpenXml for .docx, PdfPig for .pdf — master spec §3.2),
   so this component no longer calls buildDocxRendition/buildPdfRendition. It only does
   fast client-side validation, then hands the raw File up; App.jsx calls api.upload(file). */

export default function UploadPanel({ onReady, onError, busy }) {
  const [hot, setHot] = useState(false);
  const input = useRef(null);

  function handle(file) {
    if (!file) return;
    const isDocx = file.name.toLowerCase().endsWith(".docx") || file.type === DOCX;
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    if (!isDocx && !isPdf) return onError("Only .docx and .pdf are supported.");
    if (file.size > 50 * 1024 * 1024) return onError("Keep it under 50 MB.");

    onReady(file);
  }

  return (
    <div className="upload">
      <h2 style={{ margin: "0 0 6px" }}>Upload a template</h2>
      <p className="meta" style={{ marginTop: 0 }}>
        Parsed once on the server, then stored. Header, footer and headings are editable
        sections now — only the template's theme (colors, fonts, layout) stays fixed.
      </p>

      <div
        className={"dropzone" + (hot ? " hot" : "")}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setHot(true); }}
        onDragLeave={() => setHot(false)}
        onDrop={(e) => { e.preventDefault(); setHot(false); handle(e.dataTransfer.files?.[0]); }}
      >
        {busy ? "Uploading & parsing…" : "Drop a .docx or .pdf here, or click to choose"}
      </div>

      <input
        ref={input}
        type="file"
        accept=".docx,.pdf"
        style={{ display: "none" }}
        onChange={(e) => handle(e.target.files?.[0])}
      />

      <p className="meta" style={{ marginBottom: 0 }}>
        .docx keeps full fidelity. A .pdf gets one writable area per page until the
        Tika/Tesseract pipeline (master spec §2/§5) lands.
      </p>
    </div>
  );
}