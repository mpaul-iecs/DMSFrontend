import { memo, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";

type Weight = "200" | "400" | "600" | "700";

/**
 * Maps to the exact IBM Plex Sans weights imported in main.tsx. Tailwind's default scale
 * already lines up 1:1 with these — extralight=200, normal=400, semibold=600, bold=700 —
 * so no custom font-weight config is needed. Note: IBM Plex Sans has no 800/ExtraBold
 * weight; 700/Bold is the heaviest one available, used in place of it.
 */
const WEIGHT_CLASS: Record<Weight, string> = {
  "200": "font-extralight",
  "400": "font-normal",
  "600": "font-semibold",
  "700": "font-bold",
};

interface TextOwnProps {
  /** Which HTML element to render as — defaults to "span". */
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

type TextProps<T extends ElementType> = TextOwnProps & Omit<ComponentPropsWithoutRef<T>, keyof TextOwnProps>;

/**
 * Base text primitive — sets font-family (via `font-sans`, which resolves to IBM Plex
 * Sans, see index.css) and one of the four imported weights. Prefer the named
 * IBMPlexSans200/400/600/800 exports below over calling this directly with a `weight` prop.
 */
function createWeightedText(weight: Weight, displayName: string) {
  function WeightedText<T extends ElementType = "span">({ as, className = "", children, ...rest }: TextProps<T>) {
    const Component = as || "span";
    return (
      <Component className={`font-sans ${WEIGHT_CLASS[weight]} ${className}`} {...rest}>
        {children}
      </Component>
    );
  }
  WeightedText.displayName = displayName;
  return memo(WeightedText) as typeof WeightedText;
}

/** IBM Plex Sans, weight 200 (extralight) — e.g. large hero/display text. */
export const IBMPlexSans200 = createWeightedText("200", "IBMPlexSans200");

/** IBM Plex Sans, weight 400 (normal) — default body copy. */
export const IBMPlexSans400 = createWeightedText("400", "IBMPlexSans400");

/** IBM Plex Sans, weight 600 (semibold) — labels, emphasized text, subheadings. */
export const IBMPlexSans600 = createWeightedText("600", "IBMPlexSans600");

/** IBM Plex Sans, weight 700 (bold) — headings, strong emphasis. */
export const IBMPlexSans700 = createWeightedText("700", "IBMPlexSans700");
