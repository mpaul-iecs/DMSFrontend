/**
 * Tooltip — themed tooltip using @theme CSS variables for color.
 *
 * Uses inline styles (not utility classes) for background/text so colors always
 * resolve correctly when rendered via createPortal (outside the normal DOM tree,
 * so Tailwind's cascade-scoped utilities can behave unpredictably there).
 *
 * Use it to reveal the full text of anything truncated (`truncate`/`line-clamp-*`)
 * so the value is never permanently hidden from the user — and as the replacement for
 * the browser's native `title=` tooltip on icon-only buttons.
 *
 * Positioning: measured before first paint (useLayoutEffect), auto-flips to the opposite
 * side when the preferred side lacks room, is clamped inside the viewport on both axes,
 * has its arrow re-aimed at the trigger when the body had to slide sideways, recomputes on
 * scroll/resize, and caps its width to the viewport on small screens.
 */
import { useState, useRef, useEffect, useLayoutEffect, useCallback, memo, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

const GAP = 8;
const EDGE = 8; // minimum distance kept from the viewport edge
const ARROW_INSET = 12; // keeps the arrow off the tooltip's rounded corners

type Placement = "top" | "bottom" | "left" | "right";
type Variant = "dark" | "light" | "success" | "error" | "warning" | "info";

interface VariantStyle {
  bg: string;
  color: string;
  border: string;
}

/** Success/error/warning/info reference our @theme CSS vars, so they re-theme with the color preset. */
const VARIANTS: Record<Variant, VariantStyle> = {
  dark: { bg: "#1e293b", color: "#ffffff", border: "none" },
  light: { bg: "#ffffff", color: "#374151", border: "1px solid #e2e8f0" },
  success: { bg: "var(--color-success-500)", color: "#ffffff", border: "none" },
  error: { bg: "var(--color-danger-500)", color: "#ffffff", border: "none" },
  warning: { bg: "var(--color-warning-500)", color: "#1e293b", border: "none" },
  info: { bg: "var(--color-primary-500)", color: "#ffffff", border: "none" },
};

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: Placement;
  variant?: Variant;
  maxWidth?: number;
  delay?: number;
  disabled?: boolean;
  className?: string;
}

function Tooltip({
  content,
  children,
  placement = "top",
  variant = "dark",
  maxWidth = 280,
  delay = 100,
  disabled = false,
  className = "",
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [resolved, setResolved] = useState<Placement>(placement);
  // Arrow offset along the tooltip's edge — follows the trigger's center even when the
  // tooltip body itself had to slide sideways to stay inside the viewport.
  const [arrowOffset, setArrowOffset] = useState<number | null>(null);

  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const compute = useCallback(() => {
    const t = triggerRef.current;
    const tt = tooltipRef.current;
    if (!t || !tt) return;

    const tr = t.getBoundingClientRect();
    const ttH = tt.offsetHeight;
    const ttW = tt.offsetWidth;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const need = GAP + EDGE;

    // Auto-flip only when the preferred side lacks room AND the opposite side has it.
    let p = placement;
    if (p === "top" && tr.top < ttH + need && vh - tr.bottom >= ttH + need) p = "bottom";
    else if (p === "bottom" && vh - tr.bottom < ttH + need && tr.top >= ttH + need) p = "top";
    else if (p === "left" && tr.left < ttW + need && vw - tr.right >= ttW + need) p = "right";
    else if (p === "right" && vw - tr.right < ttW + need && tr.left >= ttW + need) p = "left";

    // Viewport coordinates; page scroll offsets are added at the end (tooltip is absolute).
    let top: number, left: number;
    switch (p) {
      case "bottom":
        top = tr.bottom + GAP;
        left = tr.left + tr.width / 2 - ttW / 2;
        break;
      case "left":
        top = tr.top + tr.height / 2 - ttH / 2;
        left = tr.left - ttW - GAP;
        break;
      case "right":
        top = tr.top + tr.height / 2 - ttH / 2;
        left = tr.right + GAP;
        break;
      default: // top
        top = tr.top - ttH - GAP;
        left = tr.left + tr.width / 2 - ttW / 2;
    }

    left = Math.max(EDGE, Math.min(left, vw - ttW - EDGE));
    top = Math.max(EDGE, Math.min(top, vh - ttH - EDGE));

    const vertical = p === "top" || p === "bottom";
    const center = vertical ? tr.left + tr.width / 2 - left : tr.top + tr.height / 2 - top;
    const size = vertical ? ttW : ttH;
    setArrowOffset(Math.max(ARROW_INSET, Math.min(center, size - ARROW_INSET)));
    setResolved(p);
    setCoords({ top: top + window.scrollY, left: left + window.scrollX });
  }, [placement]);

  const show = useCallback(() => {
    if (disabled || !content) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, [disabled, content, delay]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  // Layout effect (not useEffect) so the tooltip is positioned before first paint —
  // otherwise it flashes at (0,0) for a frame.
  useLayoutEffect(() => {
    if (visible) compute();
  }, [visible, compute, content]);

  // Keep it glued to the trigger if the page (or any scroll container) scrolls or resizes.
  useEffect(() => {
    if (!visible) return;
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [visible, compute]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const v = VARIANTS[variant];

  if (!content || disabled) return <>{children}</>;

  const vertical = resolved === "top" || resolved === "bottom";
  const arrowStyle: CSSProperties = {
    position: "absolute",
    width: "8px",
    height: "8px",
    backgroundColor: v.bg,
    transform: "translate(-50%, -50%) rotate(45deg)",
    ...(vertical
      ? { left: arrowOffset ?? "50%", [resolved === "top" ? "bottom" : "top"]: 0 }
      : { top: arrowOffset ?? "50%", [resolved === "left" ? "right" : "left"]: 0 }),
    ...(variant === "light" && resolved === "top" ? { borderBottom: v.border, borderRight: v.border } : {}),
    ...(variant === "light" && resolved === "bottom" ? { borderTop: v.border, borderLeft: v.border } : {}),
    ...(variant === "light" && resolved === "left" ? { borderTop: v.border, borderRight: v.border } : {}),
    ...(variant === "light" && resolved === "right" ? { borderBottom: v.border, borderLeft: v.border } : {}),
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={hide}
        className={`inline-block ${className}`}
      >
        {children}
      </span>

      {visible &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: "absolute",
              top: coords.top,
              left: coords.left,
              // Never wider than the viewport minus the edge gutters (small screens).
              maxWidth: `min(${maxWidth}px, calc(100vw - ${EDGE * 2}px))`,
              width: "max-content",
              overflowWrap: "anywhere",
              zIndex: 9999,
              pointerEvents: "none",
              backgroundColor: v.bg,
              color: v.color,
              border: v.border,
              padding: "6px 10px",
              borderRadius: "10px",
              fontSize: "0.75rem",
              lineHeight: "1.5",
              fontWeight: 500,
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            {content}
            <span style={arrowStyle} />
          </div>,
          document.body,
        )}
    </>
  );
}

export default memo(Tooltip);
