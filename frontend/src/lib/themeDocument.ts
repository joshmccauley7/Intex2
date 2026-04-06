import type { ThemePreference } from '../types/privacy';
import { clearThemeCookie } from './cookies';

export function applyThemeToDocument(theme: ThemePreference): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

/** Clears theme cookie and forces light mode on the document (preference cookies declined). */
export function resetThemeForRejectedPreferences(): void {
  clearThemeCookie();
  applyThemeToDocument('light');
}
