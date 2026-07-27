// src/theme/palette.ts
export interface ThemeColors {
  bg: string;
  card: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryLight: string;
  accent: string;
  female: string;
  male: string;
  success: string;
  error: string;
  warning: string;
  text: string;
  textMuted: string;
  textFaint: string;
  amber: string;
}

// Brand colors stay identical across modes for visual consistency
const brand = {
  primary: '#2563eb',   // blue-600
  primaryLight: '#3b82f6', // blue-500
  accent: '#4f46e5',    // indigo-600
  female: '#ec4899',    // pink-500
  male: '#3b82f6',      // blue-500
  success: '#22c55e',   // green-500
  error: '#ef4444',     // red-500
  warning: '#f59e0b',   // amber-500
  amber: '#f59e0b',
};

export const darkColors: ThemeColors = {
  ...brand,
  bg: '#0f172a',        // slate-900
  card: '#1e293b',      // slate-800
  border: '#334155',    // slate-700
  borderLight: '#475569', // slate-600
  text: '#f8fafc',      // slate-50
  textMuted: '#94a3b8', // slate-400
  textFaint: '#64748b', // slate-500
};

export const lightColors: ThemeColors = {
  ...brand,
  bg: '#f8fafc',        // slate-50
  card: '#ffffff',
  border: '#e2e8f0',    // slate-200
  borderLight: '#cbd5e1', // slate-300
  text: '#0f172a',      // slate-900
  textMuted: '#475569', // slate-600
  textFaint: '#64748b', // slate-500
};

export const palettes = { light: lightColors, dark: darkColors };

// Legacy standalone constants — kept alongside colors, unrelated to theme
export const MIN_TOUCH = 44;
export const PADDING = { xs: 8, sm: 12, md: 16, lg: 20, xl: 24 };
