import { memo } from "react";
import type { DropdownIndicatorProps, GroupBase } from "react-select";
import { components } from "react-select";

/** Clean chevron-only dropdown indicator, shared by Select and AsyncSelect. */
function SelectDropdownIndicatorInner<Option, IsMulti extends boolean, Group extends GroupBase<Option>>(
  props: DropdownIndicatorProps<Option, IsMulti, Group>,
) {
  return (
    <components.DropdownIndicator {...props}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#9CA3AF" }}>
        <path
          d="M3.5 5.25L7 8.75L10.5 5.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </components.DropdownIndicator>
  );
}

export const SelectDropdownIndicator = memo(SelectDropdownIndicatorInner) as typeof SelectDropdownIndicatorInner;

/** Hides react-select's animated loading dots — AsyncSelect uses its own message instead. */
function NoLoadingIndicatorInner() {
  return null;
}

export const NoLoadingIndicator = memo(NoLoadingIndicatorInner);
