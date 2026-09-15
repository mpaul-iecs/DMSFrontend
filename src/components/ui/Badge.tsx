import { memo, type ReactNode } from "react";
import { IBMPlexSans600 } from "./Text";

export type BadgeVariant = "draft" | "in_review" | "approved" | "rejected";

/** Same soft gradient-pill palette as the neumorphism reference design's STATUS_META map. */
const VARIANT_CLASSNAME: Record<BadgeVariant, string> = {
  draft: "bg-linear-to-br from-[#eef1f4] to-[#dfe4ea] text-[#5b6b7c]",
  in_review: "bg-linear-to-br from-[#fdf0d9] to-[#f8dfae] text-[#8a5a10]",
  approved: "bg-linear-to-br from-[#dcf3e4] to-[#c1e8cf] text-[#15803d]",
  rejected: "bg-linear-to-br from-[#fbdfda] to-[#f6c8c0] text-[#b42318]",
};

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
}

/** Status pill — document/template/user status across the app (draft, in review, approved, rejected). */
function Badge({ variant, children, className = "" }: BadgeProps) {
  return (
    <span className={`text-[11.5px] rounded-lg px-2.5 py-1 inline-block ${VARIANT_CLASSNAME[variant]} ${className}`}>
      <IBMPlexSans600 as="span">{children}</IBMPlexSans600>
    </span>
  );
}

export default memo(Badge);
