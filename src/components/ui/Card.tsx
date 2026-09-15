import { memo, type HTMLAttributes, type ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Drop the default padding — for cards that manage their own inner spacing (lists, tables). */
  noPadding?: boolean;
}

/**
 * Neumorphic surface — same background as the page, distinguished only by a soft
 * raised shadow (shadow-neu-raised, see index.css) instead of a border. Use this
 * instead of the old `bg-white rounded-xl border border-gray-200` pattern anywhere
 * a card-like container is needed.
 */
function Card({ children, noPadding = false, className = "", ...props }: CardProps) {
  return (
    <div
      className={`bg-surface-100 rounded-2xl shadow-neu-raised ${noPadding ? "" : "p-6"} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default memo(Card);
