import type { GroupBase, StylesConfig } from "react-select";

/**
 * Shared theme-matched styling for Select.tsx and AsyncSelect.tsx — the one place to
 * tune how every dropdown in the app looks. Uses our @theme CSS variables (not hex)
 * for primary/danger/surface so a runtime theme-preset switch (see utilities/theme.ts)
 * re-themes these too, without regenerating anything.
 *
 * Neumorphic: the control is a "pressed" surface (var(--shadow-neu-pressed), the same
 * inset shadow Input.tsx uses) rather than a bordered box; the open menu is a "raised"
 * surface (var(--shadow-neu-raised)) floating above it. Focus/error compose an extra
 * colored ring onto the pressed shadow as a second comma-separated shadow layer,
 * mirroring how Input.tsx composes shadow-neu-pressed with a Tailwind ring utility.
 */
export function buildSelectStyles<Option, IsMulti extends boolean = false>(
  hasError: boolean,
): StylesConfig<Option, IsMulti, GroupBase<Option>> {
  return {
    control: (base, state) => ({
      ...base,
      minHeight: "42px",
      fontSize: "0.875rem",
      borderRadius: "0.75rem",
      backgroundColor: "var(--color-surface-100)",
      border: "none",
      boxShadow: hasError
        ? "var(--shadow-neu-pressed), 0 0 0 2px color-mix(in srgb, #ef4444 30%, transparent)"
        : state.isFocused
          ? "var(--shadow-neu-pressed), 0 0 0 2px color-mix(in srgb, var(--color-primary-500) 35%, transparent)"
          : "var(--shadow-neu-pressed)",
      transition: "box-shadow 150ms",
      cursor: "pointer",
    }),
    valueContainer: (base) => ({ ...base, padding: "2px 8px", gap: "4px" }),
    placeholder: (base) => ({ ...base, color: "#8b98a7", fontSize: "0.875rem" }),
    singleValue: (base) => ({ ...base, color: "#28313c", fontSize: "0.875rem" }),
    input: (base) => ({ ...base, color: "#28313c", fontSize: "0.875rem", margin: 0, padding: 0 }),
    indicatorSeparator: () => ({ display: "none" }),
    clearIndicator: (base) => ({
      ...base,
      padding: "2px 4px",
      color: "#8b98a7",
      "&:hover": { color: "#28313c" },
    }),
    dropdownIndicator: (base) => ({ ...base, padding: "2px 8px" }),
    menu: (base) => ({
      ...base,
      borderRadius: "1rem",
      border: "none",
      backgroundColor: "var(--color-surface-100)",
      boxShadow: "var(--shadow-neu-raised)",
      zIndex: 9999,
      overflow: "hidden",
      marginTop: "6px",
    }),
    menuList: (base) => ({ ...base, padding: "6px", maxHeight: "220px" }),
    option: (base, state) => ({
      ...base,
      fontSize: "0.875rem",
      borderRadius: "0.625rem",
      padding: "8px 10px",
      cursor: "pointer",
      backgroundColor: state.isSelected
        ? "color-mix(in srgb, var(--color-primary-500) 15%, var(--color-surface-100))"
        : state.isFocused
          ? "var(--color-surface-200)"
          : "transparent",
      color: state.isSelected ? "var(--color-primary-700)" : "#28313c",
      fontWeight: state.isSelected ? 500 : 400,
      "&:active": { backgroundColor: "color-mix(in srgb, var(--color-primary-500) 25%, var(--color-surface-100))" },
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "color-mix(in srgb, var(--color-primary-500) 12%, var(--color-surface-100))",
      borderRadius: "0.5rem",
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
      borderRadius: "0 0.5rem 0.5rem 0",
      "&:hover": {
        backgroundColor: "color-mix(in srgb, var(--color-primary-500) 25%, var(--color-surface-100))",
        color: "var(--color-primary-800)",
      },
    }),
    noOptionsMessage: (base) => ({ ...base, fontSize: "0.875rem", color: "#8b98a7", padding: "8px 10px" }),
    loadingMessage: (base) => ({ ...base, fontSize: "0.875rem", color: "#8b98a7", padding: "8px 10px" }),
  };
}
