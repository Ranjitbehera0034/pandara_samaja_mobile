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

export const MIN_TOUCH = 44;

// Spacing scale — matches the 4/8/12/16/24/32 grid already dominant across
// the app's inline styles; use instead of ad hoc padding/margin/gap values.
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

// Corner-radius scale — sm/md map to the two most common existing radii
// (rounded-xl=12, rounded-2xl/inline-16=16).
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 };

export type FontWeight = '400' | '500' | '600' | '700' | '800';
export interface TypographyRole {
  fontSize: number;
  lineHeight: number;
  fontWeight: FontWeight;
}

// Named type roles, each pairing a font size with a matched line-height —
// most text in the app today sets no line-height at all, which is why body
// copy outside post captions tends to read cramped.
export const typography: Record<
  'caption' | 'body' | 'bodyEmphasis' | 'label' | 'title' | 'heading' | 'display',
  TypographyRole
> = {
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  bodyEmphasis: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  display: { fontSize: 24, lineHeight: 32, fontWeight: '800' },
};

// Elevation presets — formalizes the NativeWind `shadow-lg` most cards
// already lean on informally, with a matched Android `elevation`.
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  raised: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;
