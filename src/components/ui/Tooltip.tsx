/**
 * Tooltip — themed tooltip using @theme CSS variables for color.
 *
 * Uses inline styles (not utility classes) for background/text so colors always
 * resolve correctly when rendered via createPortal (outside the normal DOM tree,
 * so Tailwind's cascade-scoped utilities can behave unpredictably there).
 *
 * Use it to reveal the full text of anything truncated (`truncate`/`line-clamp-*`)
 * so the value is never permanently hidden from the user.
 */
import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";

const GAP = 8;

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

export default function Tooltip({
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
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // Auto-flip
    let p = placement;
    if (p === "top" && tr.top < ttH + GAP + 4) p = "bottom";
    else if (p === "bottom" && vh - tr.bottom < ttH + GAP + 4) p = "top";
    else if (p === "left" && tr.left < ttW + GAP + 4) p = "right";
    else if (p === "right" && vw - tr.right < ttW + GAP + 4) p = "left";
    setResolved(p);

    let top: number, left: number;
    switch (p) {
      case "bottom":
        top = tr.bottom + scrollY + GAP;
        left = tr.left + scrollX + tr.width / 2 - ttW / 2;
        break;
      case "left":
        top = tr.top + scrollY + tr.height / 2 - ttH / 2;
        left = tr.left + scrollX - ttW - GAP;
        break;
      case "right":
        top = tr.top + scrollY + tr.height / 2 - ttH / 2;
        left = tr.right + scrollX + GAP;
        break;
      default: // top
        top = tr.top + scrollY - ttH - GAP;
        left = tr.left + scrollX + tr.width / 2 - ttW / 2;
    }

    left = Math.max(scrollX + 8, Math.min(left, scrollX + vw - ttW - 8));
    top = Math.max(scrollY + 8, top);
    setCoords({ top, left });
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

  useEffect(() => {
    if (visible) compute();
  }, [visible, compute]);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (!content || disabled) return <>{children}</>;

  const v = VARIANTS[variant];

  const arrowPos =
    resolved === "bottom"
      ? "absolute -top-1 left-1/2 -translate-x-1/2"
      : resolved === "left"
        ? "absolute top-1/2 -right-1 -translate-y-1/2"
        : resolved === "right"
          ? "absolute top-1/2 -left-1 -translate-y-1/2"
          : "absolute -bottom-1 left-1/2 -translate-x-1/2";

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
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
              maxWidth,
              zIndex: 9999,
              pointerEvents: "none",
              backgroundColor: v.bg,
              color: v.color,
              border: v.border,
              padding: "6px 10px",
              borderRadius: "8px",
              fontSize: "0.75rem",
              lineHeight: "1.5",
              fontWeight: 500,
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            {content}

            <span
              className={arrowPos}
              style={{
                width: "8px",
                height: "8px",
                backgroundColor: v.bg,
                transform: "rotate(45deg)",
                ...(variant === "light" && resolved === "top" ? { borderBottom: v.border, borderRight: v.border } : {}),
                ...(variant === "light" && resolved === "bottom" ? { borderTop: v.border, borderLeft: v.border } : {}),
                ...(variant === "light" && resolved === "left" ? { borderTop: v.border, borderRight: v.border } : {}),
                ...(variant === "light" && resolved === "right" ? { borderBottom: v.border, borderLeft: v.border } : {}),
              }}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
