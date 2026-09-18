import { memo, useCallback, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { IBMPlexSans600 } from "./Text";

export interface AccordionItem {
  id: string | number;
  header: ReactNode;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  /** Which item id starts expanded (uncontrolled after that — each row manages its own open
   * state via a single-expand-at-a-time controller below). `null` starts fully collapsed. */
  defaultExpandedId?: string | number | null;
  className?: string;
}

/**
 * Generic single-open-at-a-time accordion — neumorphic pressed-shadow rows, no borders.
 * Reusable anywhere a collapsible list of sections is needed (see TemplateVersionAccordion
 * for the first consumer); don't build a one-off collapsible list elsewhere in the app,
 * wrap it in this instead.
 */
function Accordion({ items, defaultExpandedId = null, className = "" }: AccordionProps) {
  const [expandedId, setExpandedId] = useState<string | number | null>(defaultExpandedId);

  const handleToggle = useCallback((id: string | number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item) => (
        <AccordionRow
          key={item.id}
          item={item}
          isExpanded={expandedId === item.id}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}

interface AccordionRowProps {
  item: AccordionItem;
  isExpanded: boolean;
  onToggle: (id: string | number) => void;
}

function AccordionRow({ item, isExpanded, onToggle }: AccordionRowProps) {
  const handleClick = useCallback(() => onToggle(item.id), [onToggle, item.id]);

  return (
    <div className="rounded-lg shadow-neu-pressed-sm overflow-hidden">
      <button type="button" onClick={handleClick} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          )}
          <IBMPlexSans600 as="span" className="text-sm text-gray-800 min-w-0 flex-1">
            {item.header}
          </IBMPlexSans600>
        </div>
      </button>
      {isExpanded && <div className="px-3 pb-3 pt-1 space-y-1">{item.content}</div>}
    </div>
  );
}

export default memo(Accordion);
