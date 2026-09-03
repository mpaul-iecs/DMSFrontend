/* Everything persists in localStorage. No backend in this prototype.
   Keys mirror the real model so the shapes carry over:
     dms.rendition        the parsed template (html + css + block list)
     dms.content.tiptap   { blockKey: html }
     dms.content.lexical  { blockKey: html }
     dms.comments         [ { id, blockKey, start, end, quote, body, status } ]
*/

const K = {
  rendition: "dms.rendition",
  content: (engine) => `dms.content.${engine}`,
  comments: "dms.comments",
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (e) {
    const quota = e?.name === "QuotaExceededError" || e?.code === 22;
    return {
      ok: false,
      error: quota
        ? "localStorage is full (about 5 MB). Use a smaller template or clear the current one."
        : "Could not write to localStorage.",
    };
  }
}

export const storage = {
  loadRendition: () => read(K.rendition, null),
  saveRendition: (r) => write(K.rendition, r),

  loadContent: (engine) => read(K.content(engine), {}),
  saveContent: (engine, map) => write(K.content(engine), map),

  loadComments: () => read(K.comments, []),
  saveComments: (list) => write(K.comments, list),

  clearAll() {
    [
      K.rendition,
      K.comments,
      K.content("tiptap"),
      K.content("lexical"),
    ].forEach((k) => localStorage.removeItem(k));
  },

  usageKb() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith("dms.")) total += (localStorage.getItem(k) || "").length;
    }
    return Math.round(total / 1024);
  },
};
