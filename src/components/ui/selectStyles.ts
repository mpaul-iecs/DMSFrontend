import type { GroupBase, StylesConfig } from "react-select";

/**
 * Shared theme-matched styling for Select.tsx and AsyncSelect.tsx — the one place to
 * tune how every dropdown in the app looks. Uses our @theme CSS variables (not hex)
 * for primary/danger so a runtime theme-preset switch (see utilities/theme.ts)
 * re-themes these too, without regenerating anything.
 */
export function buildSelectStyles<Option, IsMulti extends boolean = false>(
  hasError: boolean,
): StylesConfig<Option, IsMulti, GroupBase<Option>> {
  return {
    control: (base, state) => ({
      ...base,
      minHeight: "42px",
      fontSize: "0.875rem",
      borderRadius: "0.5rem",
      backgroundColor: "#fff",
      borderColor: hasError ? "#fca5a5" : state.isFocused ? "var(--color-primary-500)" : "#D1D5DB",
      boxShadow: hasError
        ? "0 0 0 2px color-mix(in srgb, #ef4444 15%, transparent)"
        : state.isFocused
          ? "0 0 0 2px color-mix(in srgb, var(--color-primary-500) 20%, transparent)"
          : "none",
      "&:hover": { borderColor: hasError ? "#fca5a5" : "#9CA3AF" },
      transition: "border-color 150ms, box-shadow 150ms",
      cursor: "pointer",
    }),
    valueContainer: (base) => ({ ...base, padding: "2px 8px", gap: "4px" }),
    placeholder: (base) => ({ ...base, color: "#9CA3AF", fontSize: "0.875rem" }),
    singleValue: (base) => ({ ...base, color: "#111827", fontSize: "0.875rem" }),
    input: (base) => ({ ...base, color: "#111827", fontSize: "0.875rem", margin: 0, padding: 0 }),
    indicatorSeparator: () => ({ display: "none" }),
    clearIndicator: (base) => ({
      ...base,
      padding: "2px 4px",
      color: "#9CA3AF",
      "&:hover": { color: "#374151" },
    }),
    dropdownIndicator: (base) => ({ ...base, padding: "2px 8px" }),
    menu: (base) => ({
      ...base,
      borderRadius: "0.625rem",
      border: "1px solid #E5E7EB",
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)",
      zIndex: 9999,
      overflow: "hidden",
      marginTop: "4px",
    }),
    menuList: (base) => ({ ...base, padding: "4px", maxHeight: "220px" }),
    option: (base, state) => ({
      ...base,
      fontSize: "0.875rem",
      borderRadius: "0.375rem",
      padding: "6px 10px",
      cursor: "pointer",
      backgroundColor: state.isSelected
        ? "color-mix(in srgb, var(--color-primary-500) 12%, white)"
        : state.isFocused
          ? "#F9FAFB"
          : "transparent",
      color: state.isSelected ? "var(--color-primary-700)" : "#374151",
      fontWeight: state.isSelected ? 500 : 400,
      "&:active": { backgroundColor: "color-mix(in srgb, var(--color-primary-500) 20%, white)" },
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "color-mix(in srgb, var(--color-primary-500) 12%, white)",
      borderRadius: "0.375rem",
      margin: "1px 2px",
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: "var(--color-primary-700)",
      fontSize: "0.8125rem",
      fontWeight: 500,
      padding: "1px 4px",
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: "var(--color-primary-500)",
      borderRadius: "0 0.375rem 0.375rem 0",
      "&:hover": {
        backgroundColor: "color-mix(in srgb, var(--color-primary-500) 25%, white)",
        color: "var(--color-primary-800)",
      },
    }),
    noOptionsMessage: (base) => ({ ...base, fontSize: "0.875rem", color: "#9CA3AF", padding: "8px 10px" }),
    loadingMessage: (base) => ({ ...base, fontSize: "0.875rem", color: "#9CA3AF", padding: "8px 10px" }),
  };
}
