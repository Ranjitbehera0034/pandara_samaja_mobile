// src/theme/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
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
  const { colorScheme, setColorScheme } = useNativeWindColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    storage.getItem(STORAGE_KEYS.THEME).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
        setColorScheme(saved);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMode = async (m: ThemeMode) => {
    setModeState(m);
    setColorScheme(m);
    await storage.setItem(STORAGE_KEYS.THEME, m);
  };

  const scheme: ResolvedScheme = colorScheme === 'dark' ? 'dark' : 'light';
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
