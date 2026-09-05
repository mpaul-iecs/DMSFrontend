import React, { useRef, useState } from "react";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/* Parsing happens on the backend (OpenXml → one clean HTML string, mammoth-style style
   mapping — see docs/backend-integration.md). This component only does fast client-side
   validation, then hands the raw File up; App.jsx calls api.upload(file). PDF upload is
   deferred — docx only for now. */
export default function UploadPanel({ onReady, onError, busy }) {
  const [hot, setHot] = useState(false);
  const input = useRef(null);

  function handle(file) {
    if (!file) return;
    const isDocx = file.name.toLowerCase().endsWith(".docx") || file.type === DOCX;
    if (!isDocx) return onError("Only .docx is supported right now — PDF is coming later.");
    if (file.size > 50 * 1024 * 1024) return onError("Keep it under 50 MB.");
    onReady(file);
  }

  return (
    <div className="mx-auto my-16 max-w-xl rounded-lg bg-white p-8 text-center shadow-sm">
      <h2 className="mb-1.5 text-lg font-semibold text-slate-900">Upload a document</h2>
      <p className="mt-0 text-xs text-slate-500">
        Parsed once on the server, then stored as one editable document — edit it like
        any Word file, no locked sections.
      </p>

      <div
        className={`cursor-pointer rounded-md border-2 border-dashed px-5 py-11 text-sm text-slate-500 transition-colors ${
          hot ? "border-emerald-700 bg-emerald-50" : "border-slate-300"
        }`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setHot(true); }}
        onDragLeave={() => setHot(false)}
        onDrop={(e) => { e.preventDefault(); setHot(false); handle(e.dataTransfer.files?.[0]); }}
      >
        {busy ? "Uploading & parsing…" : "Drop a .docx here, or click to choose"}
      </div>

      <input
        ref={input}
        type="file"
        accept=".docx"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />

      <p className="mb-0 mt-3 text-xs text-slate-500">PDF upload is coming later.</p>
    </div>
  );
}
