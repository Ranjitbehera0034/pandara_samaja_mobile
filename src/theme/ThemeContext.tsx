// src/theme/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { storage } from '../utils/secureStorage';
import { STORAGE_KEYS } from '../config/constants';
import {
  palettes, ThemeColors, MIN_TOUCH,
  spacing, radius, typography, shadow,
} from './palette';

export type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedScheme = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  scheme: ResolvedScheme;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadow: typeof shadow;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // React Native's own hook — reactively tracks the OS appearance, used
  // only as the fallback for 'system' mode. Deliberately NOT nativewind's
  // useColorScheme/setColorScheme: nativewind's setColorScheme('light' |
  // 'dark') routes through RN's Appearance.setColorScheme(), which is a
  // testing-oriented API (see React Native's own docs) that doesn't
  // reliably override the OS appearance on a real device — picking
  // "Light" while the OS is in Dark Mode visibly did nothing. This app
  // has zero Tailwind `dark:` classes anywhere (confirmed) — every screen
  // already reads colors.* from this context, not nativewind's own
  // dark-mode system — so the fix is to stop depending on that bridge
  // entirely and resolve the scheme directly from this app's own
  // persisted `mode`.
  const systemScheme = useRNColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    storage.getItem(STORAGE_KEYS.THEME).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
    });
  }, []);

  const setMode = async (m: ThemeMode) => {
    setModeState(m);
    await storage.setItem(STORAGE_KEYS.THEME, m);
  };

  const scheme: ResolvedScheme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const colors = palettes[scheme];

  return (
    <ThemeContext.Provider value={{ mode, scheme, colors, spacing, radius, typography, shadow, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export { MIN_TOUCH };
