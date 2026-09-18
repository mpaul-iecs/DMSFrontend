import { memo, useCallback, useRef, type ChangeEvent } from "react";
import type { Editor } from "@tiptap/react";
import { Paperclip } from "lucide-react";
import ToolbarButton from "./ToolbarButton";
import { fileToDataUrl } from "../core/fileToDataUrl";

interface AttachmentButtonProps {
  editor: Editor;
}

function AttachmentButton({ editor }: AttachmentButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => inputRef.current?.click(), []);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = await fileToDataUrl(file);
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
      editor
        .chain()
        .focus()
        .setAttachment({ url, fileName: file.name, fileSize: file.size, fileExt: ext, fileType: file.type })
        .run();
      e.target.value = "";
    },
    [editor],
  );

  return (
    <>
      <ToolbarButton icon={Paperclip} label="Attach file" onClick={handleClick} />
      <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
    </>
  );
}

export default memo(AttachmentButton);
