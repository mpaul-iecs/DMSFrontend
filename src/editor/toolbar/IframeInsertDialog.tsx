import { memo, useCallback, useState, type ChangeEvent, type MouseEvent as ReactMouseEvent } from "react";
import type { Editor } from "@tiptap/react";
import { AppWindow } from "lucide-react";
import ToolbarButton from "./ToolbarButton";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

interface IframeInsertDialogProps {
  editor: Editor;
}

const stopMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => e.stopPropagation();

function IframeInsertDialog({ editor }: IframeInsertDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  const handleOpen = useCallback(() => {
    setUrl("");
    setOpen(true);
  }, []);
  const handleCancel = useCallback(() => setOpen(false), []);
  const handleUrlChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value), []);

  const handleInsert = useCallback(() => {
    const trimmed = url.trim();
    if (!trimmed) return;
    editor.chain().focus().setIframe({ src: trimmed, service: "custom" }).run();
    setOpen(false);
  }, [editor, url]);

  return (
    <>
      <ToolbarButton icon={AppWindow} label="Embed iframe" onClick={handleOpen} />
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={handleCancel}>
          <div
            className="w-full max-w-sm rounded-2xl bg-surface-100 shadow-2xl p-6 space-y-4"
            onMouseDown={stopMouseDown}
          >
            <Input label="Embed URL" value={url} onChange={handleUrlChange} placeholder="https://…" autoFocus />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleInsert}>
                Insert
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default memo(IframeInsertDialog);
