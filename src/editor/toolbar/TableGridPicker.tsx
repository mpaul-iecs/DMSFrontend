import { memo, useState, useCallback } from "react";

interface TableGridPickerProps {
  onPick: (rows: number, cols: number) => void;
  maxRows?: number;
  maxCols?: number;
}

/** Hover grid for "insert table NxM" — cells light up along the hovered rows/cols path,
 * neumorphic pressed/raised cells instead of a plain bordered grid. */
function TableGridPicker({ onPick, maxRows = 8, maxCols = 8 }: TableGridPickerProps) {
  const [hover, setHover] = useState({ rows: 0, cols: 0 });

  const handleEnter = useCallback((r: number, c: number) => setHover({ rows: r, cols: c }), []);
  const handleClick = useCallback((r: number, c: number) => onPick(r, c), [onPick]);

  return (
    <div className="p-2">
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${maxCols}, 1.1rem)` }}>
        {Array.from({ length: maxRows * maxCols }, (_, i) => {
          const r = Math.floor(i / maxCols) + 1;
          const c = (i % maxCols) + 1;
          const active = r <= hover.rows && c <= hover.cols;
          return (
            <button
              key={i}
              type="button"
              onMouseEnter={() => handleEnter(r, c)}
              onClick={() => handleClick(r, c)}
              className={`w-[1.1rem] h-[1.1rem] rounded-sm transition-shadow ${
                active ? "shadow-neu-raised-sm bg-primary-200" : "shadow-neu-pressed-sm"
              }`}
            />
          );
        })}
      </div>
      <p className="text-center text-xs text-gray-500 mt-2">
        {hover.rows || 1} × {hover.cols || 1}
      </p>
    </div>
  );
}

export default memo(TableGridPicker);
