/** Ported from DMSEditor's DocumentEditor.jsx. Images/video/attachments/diagrams are inlined
 * as base64 data URLs so a saved draft is self-contained — the backend sanitizer already
 * allow-lists the `data:` scheme (see DMSBackend's docx sanitizer allow-list). */
export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
