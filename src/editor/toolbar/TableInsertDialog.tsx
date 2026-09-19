import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Table2 } from "lucide-react";
import ToolbarButton from "./ToolbarButton";
import TableGridPicker from "./TableGridPicker";

interface TableInsertDialogProps {
  editor: Editor;
}

function TableInsertDialog({ editor }: TableInsertDialogProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const toggleOpen = useCallback(() => setOpen((v) => !v), []);

  const handlePick = useCallback(
    (rows: number, cols: number) => {
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
      setOpen(false);
    },
    [editor],
  );

  return (
    <div className="relative" ref={containerRef}>
      <ToolbarButton icon={Table2} label="Insert table" active={open} onClick={toggleOpen} />
      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 rounded-xl bg-surface-100 shadow-neu-raised">
          <TableGridPicker onPick={handlePick} />
        </div>
      )}
    </div>
  );
}

export default memo(TableInsertDialog);
