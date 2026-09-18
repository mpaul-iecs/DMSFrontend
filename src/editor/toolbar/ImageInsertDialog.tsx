import { memo, useCallback, useState, type ChangeEvent, type MouseEvent as ReactMouseEvent } from "react";
import type { Editor } from "@tiptap/react";
import { ImageIcon, Upload } from "lucide-react";
import ToolbarButton from "./ToolbarButton";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { IBMPlexSans400 } from "../../components/ui/Text";
import { fileToDataUrl } from "../core/fileToDataUrl";

interface ImageInsertDialogProps {
  editor: Editor;
}

const stopMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => e.stopPropagation();

/** Small neumorphic modal for inserting an image, either by URL or by file upload (converted
 * to a base64 data URL — see fileToDataUrl.ts's doc comment on why). Replaces
 * reactjs-tiptap-editor's own non-Tailwind RichTextImage dialog. */
function ImageInsertDialog({ editor }: ImageInsertDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  const handleOpen = useCallback(() => {
    setUrl("");
    setOpen(true);
  }, []);
  const handleCancel = useCallback(() => setOpen(false), []);
  const handleUrlChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value), []);

  const handleInsertUrl = useCallback(() => {
    const trimmed = url.trim();
    if (!trimmed) return;
    editor.chain().focus().setImage({ src: trimmed }).run();
    setOpen(false);
  }, [editor, url]);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const dataUrl = await fileToDataUrl(file);
      editor.chain().focus().setImage({ src: dataUrl }).run();
      setOpen(false);
    },
    [editor],
  );

  return (
    <>
      <ToolbarButton icon={ImageIcon} label="Insert image" onClick={handleOpen} />
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={handleCancel}>
          <div
            className="w-full max-w-sm rounded-2xl bg-surface-100 shadow-2xl p-6 space-y-4"
            onMouseDown={stopMouseDown}
          >
            <Input label="Image URL" value={url} onChange={handleUrlChange} placeholder="https://…" autoFocus />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleInsertUrl}>
                Insert
              </Button>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-surface-200/70">
              <IBMPlexSans400 as="span" className="text-xs text-gray-500">
                or
              </IBMPlexSans400>
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-100 shadow-neu-pressed cursor-pointer text-xs text-gray-600">
                <Upload className="w-3.5 h-3.5" />
                Upload a file
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default memo(ImageInsertDialog);
