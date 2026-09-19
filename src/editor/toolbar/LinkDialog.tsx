import { memo, useCallback, useState, type FormEvent, type MouseEvent as ReactMouseEvent } from "react";
import type { Editor } from "@tiptap/react";
import { Link2 } from "lucide-react";
import ToolbarButton from "./ToolbarButton";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

interface LinkDialogProps {
  editor: Editor;
}

const stopMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => e.stopPropagation();

/** Small neumorphic modal for inserting/editing a link — replaces reactjs-tiptap-editor's
 * own non-Tailwind RichTextLink bubble UI. */
function LinkDialog({ editor }: LinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  const handleOpen = useCallback(() => {
    const existing = editor.getAttributes("link").href as string | undefined;
    setUrl(existing ?? "");
    setOpen(true);
  }, [editor]);

  const handleCancel = useCallback(() => setOpen(false), []);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value), []);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = url.trim();
      if (trimmed) editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
      else editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setOpen(false);
    },
    [editor, url],
  );

  return (
    <>
      <ToolbarButton icon={Link2} label="Insert link" active={editor.isActive("link")} onClick={handleOpen} />
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={handleCancel}>
          <div
            className="w-full max-w-sm rounded-2xl bg-surface-100 shadow-2xl p-6 space-y-4"
            onMouseDown={stopMouseDown}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Link URL" value={url} onChange={handleUrlChange} placeholder="https://…" autoFocus />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Insert
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default memo(LinkDialog);
