import type { UniversityTheme, UniversitySettings } from '../types';

export const PRESET_THEMES: UniversityTheme[] = [
  {
    id: 'ucr',
    name: 'UC Riverside (UCR Blue & Highlander Gold - Default)',
    primaryColor: '#003B5C',
    accentColor: '#FFB81C',
    bgDark: '#020617',
    primaryGlow: 'rgba(0, 59, 92, 0.45)',
  },
  {
    id: 'crimson',
    name: 'Crimson & Slate (Harvard / Stanford)',
    primaryColor: '#b91c1c',
    accentColor: '#f59e0b',
    bgDark: '#0a0a0c',
    primaryGlow: 'rgba(185, 28, 28, 0.45)',
  },
  {
    id: 'maize',
    name: 'Maize & Navy (Michigan / UCLA)',
    primaryColor: '#1d4ed8',
    accentColor: '#eab308',
    bgDark: '#030712',
    primaryGlow: 'rgba(29, 78, 216, 0.45)',
  },
  {
    id: 'emerald',
    name: 'Emerald Forest (Dartmouth / Charlotte)',
    primaryColor: '#059669',
    accentColor: '#10b981',
    bgDark: '#02120a',
    primaryGlow: 'rgba(5, 150, 105, 0.45)',
  },
  {
    id: 'navy',
    name: 'Oxford Navy & Gold (Georgetown / Notre Dame)',
    primaryColor: '#1e3a8a',
    accentColor: '#d97706',
    bgDark: '#020617',
    primaryGlow: 'rgba(30, 58, 138, 0.45)',
  },
  {
    id: 'purple',
    name: 'Royal Purple (NYU / Northwestern)',
    primaryColor: '#7c3aed',
    accentColor: '#ec4899',
    bgDark: '#090514',
    primaryGlow: 'rgba(124, 58, 237, 0.45)',
  },
  {
    id: 'sky',
    name: 'Cyber Shield (High-Contrast Navy & Cyan)',
    primaryColor: '#0284c7',
    accentColor: '#10b981',
    bgDark: '#020617',
    primaryGlow: 'rgba(2, 132, 199, 0.45)',
  },
];

export const DEFAULT_SETTINGS: UniversitySettings = {
  universityName: 'University of California, Riverside',
  universityShortName: 'UCR',
  primaryColor: '#003B5C',
  accentColor: '#FFB81C',
  themePreset: 'ucr',
  campusPolicePhone: '(951) 827-5222',
  studentEscortPhone: '(951) 827-3772',
  counselingHotline: '(951) 827-5531',
  defaultCheckinIntervalHours: 48,
  gracePeriodSeconds: 60,
  lowBatteryThresholdPct: 5,
  require2FAForStaff: false,
};

export function applyThemeVariables(primaryColor: string, accentColor: string): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Clean hex format
  const primary = primaryColor.startsWith('#') ? primaryColor : `#${primaryColor}`;
  const accent = accentColor.startsWith('#') ? accentColor : `#${accentColor}`;

  root.style.setProperty('--theme-primary', primary);
  root.style.setProperty('--theme-accent', accent);
  root.style.setProperty('--theme-primary-subtle', `${primary}26`); // 15% opacity
  root.style.setProperty('--theme-primary-border', `${primary}66`); // 40% opacity
  root.style.setProperty('--theme-accent-subtle', `${accent}26`);
  root.style.setProperty('--theme-accent-border', `${accent}66`);
  root.style.setProperty('--theme-primary-glow', `0 0 16px ${primary}50`);
}

export function loadSavedSettings(): UniversitySettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const raw = localStorage.getItem('cs_university_settings');
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw);
    // Auto-migrate legacy demo defaults to UCR
    if (parsed.universityShortName === 'MSU' || parsed.universityName?.includes('Metropolitan State')) {
      localStorage.removeItem('cs_university_settings');
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveLocalSettings(settings: UniversitySettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cs_university_settings', JSON.stringify(settings));
  applyThemeVariables(settings.primaryColor, settings.accentColor);
}
