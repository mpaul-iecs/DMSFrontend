interface ColorScale {
  50?: string;
  100?: string;
  200?: string;
  300?: string;
  400?: string;
  500: string;
  600: string;
  700?: string;
  800?: string;
  900?: string;
}

interface ColorPreset {
  name: string;
  primary: ColorScale;
  danger: ColorScale;
  success: ColorScale;
  warning: ColorScale;
}

export const COLOR_PRESETS: Record<string, ColorPreset> = {
  ocean: {
    name: "Ocean Blue",
    primary: { 50: "#f0f9ff", 100: "#e0f2fe", 200: "#b9e5fd", 300: "#7cd3fc", 400: "#36bef8", 500: "#0496c7", 600: "#0380ab", 700: "#03668a", 800: "#075572", 900: "#0c475f" },
    danger: { 500: "#ef4444", 600: "#dc2626" },
    success: { 500: "#22c55e", 600: "#16a34a" },
    warning: { 500: "#f59e0b", 600: "#d97706" },
  },
  teal: {
    name: "Teal Green",
    primary: { 50: "#f0fdfa", 100: "#ccfbf1", 200: "#99f6e4", 300: "#5eead4", 400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488", 700: "#0f766e", 800: "#115e59", 900: "#134e4a" },
    danger: { 500: "#ef4444", 600: "#dc2626" },
    success: { 500: "#22c55e", 600: "#16a34a" },
    warning: { 500: "#f59e0b", 600: "#d97706" },
  },
  indigo: {
    name: "Indigo Night",
    primary: { 50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe", 300: "#a5b4fc", 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 800: "#3730a3", 900: "#312e81" },
    danger: { 500: "#ef4444", 600: "#dc2626" },
    success: { 500: "#22c55e", 600: "#16a34a" },
    warning: { 500: "#f59e0b", 600: "#d97706" },
  },
  slate: {
    name: "Slate Professional",
    primary: { 50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0", 300: "#cbd5e1", 400: "#94a3b8", 500: "#64748b", 600: "#475569", 700: "#334155", 800: "#1e293b", 900: "#0f172a" },
    danger: { 500: "#ef4444", 600: "#dc2626" },
    success: { 500: "#22c55e", 600: "#16a34a" },
    warning: { 500: "#f59e0b", 600: "#d97706" },
  },
};

export const SURFACE_COLORS: Record<string, string> = { 50: "#ffffff", 100: "#f8fafc", 200: "#f1f5f9" };
export const DEFAULT_PRESET = "ocean";

export function applyTheme(presetKey: string = DEFAULT_PRESET) {
  const preset = COLOR_PRESETS[presetKey] || COLOR_PRESETS[DEFAULT_PRESET];
  const root = document.documentElement;
  Object.entries(preset.primary).forEach(([s, h]) => root.style.setProperty(`--color-primary-${s}`, h as string));
  Object.entries(preset.danger).forEach(([s, h]) => root.style.setProperty(`--color-danger-${s}`, h as string));
  Object.entries(preset.success).forEach(([s, h]) => root.style.setProperty(`--color-success-${s}`, h as string));
  Object.entries(preset.warning).forEach(([s, h]) => root.style.setProperty(`--color-warning-${s}`, h as string));
  Object.entries(SURFACE_COLORS).forEach(([s, h]) => root.style.setProperty(`--color-surface-${s}`, h));
}
