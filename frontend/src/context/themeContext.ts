import { createContext } from 'react';
import type { ThemePreference } from '../types/privacy';

export interface ThemeContextValue {
  theme: ThemePreference;
  toggleTheme: () => void;
  setTheme: (t: ThemePreference) => void;
  canPersistTheme: boolean;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
