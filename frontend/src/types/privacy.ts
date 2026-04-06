export type ThemePreference = 'light' | 'dark';

export interface ConsentState {
  /** User has completed the consent flow (banner dismissed with a stored choice). */
  consentGiven: boolean;
  /** Always true when consent is saved — required for site operation / consent record. */
  essential: true;
  /** Preference cookies (e.g. theme_preference). */
  preferences: boolean;
  /** Optional analytics cookies / scripts. */
  analytics: boolean;
  /** Optional marketing cookies / scripts. */
  marketing: boolean;
  updatedAt: string;
}

export interface ConsentCategoryToggle {
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
}
