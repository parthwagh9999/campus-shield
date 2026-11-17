import type { UniversityTheme, UniversitySettings } from '../types';

export const PRESET_THEMES: UniversityTheme[] = [
  {
    id: 'sky',
    name: 'Cyber Shield (Default)',
    primaryColor: '#0284c7',
    accentColor: '#10b981',
    bgDark: '#020617',
    primaryGlow: 'rgba(2, 132, 199, 0.35)',
  },
  {
    id: 'crimson',
    name: 'Crimson & Slate (Harvard / Stanford)',
    primaryColor: '#b91c1c',
    accentColor: '#f59e0b',
    bgDark: '#0a0a0c',
    primaryGlow: 'rgba(185, 28, 28, 0.35)',
  },
  {
    id: 'maize',
    name: 'Maize & Navy (Michigan / UCLA)',
    primaryColor: '#1d4ed8',
    accentColor: '#eab308',
    bgDark: '#030712',
    primaryGlow: 'rgba(29, 78, 216, 0.35)',
  },
  {
    id: 'emerald',
    name: 'Emerald Forest (Dartmouth / Charlotte)',
    primaryColor: '#059669',
    accentColor: '#10b981',
    bgDark: '#02120a',
    primaryGlow: 'rgba(5, 150, 105, 0.35)',
  },
  {
    id: 'navy',
    name: 'Oxford Navy & Gold (Georgetown / Notre Dame)',
    primaryColor: '#1e3a8a',
    accentColor: '#d97706',
    bgDark: '#020617',
    primaryGlow: 'rgba(30, 58, 138, 0.35)',
  },
  {
    id: 'purple',
    name: 'Royal Purple (NYU / Northwestern)',
    primaryColor: '#7c3aed',
    accentColor: '#ec4899',
    bgDark: '#090514',
    primaryGlow: 'rgba(124, 58, 237, 0.35)',
  },
];

export const DEFAULT_SETTINGS: UniversitySettings = {
  universityName: 'Metropolitan State University',
  universityShortName: 'MSU',
  primaryColor: '#0284c7',
  accentColor: '#10b981',
  themePreset: 'sky',
  campusPolicePhone: '(555) 911-SAFE',
  studentEscortPhone: '(555) 234-RIDE',
  counselingHotline: '(555) 345-HELP',
  defaultCheckinIntervalHours: 48,
  gracePeriodSeconds: 60,
  lowBatteryThresholdPct: 5,
  require2FAForStaff: false,
};

export function applyThemeVariables(primaryColor: string, accentColor: string): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', primaryColor);
  root.style.setProperty('--theme-accent', accentColor);
}

export function loadSavedSettings(): UniversitySettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const raw = localStorage.getItem('cs_university_settings');
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveLocalSettings(settings: UniversitySettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cs_university_settings', JSON.stringify(settings));
  applyThemeVariables(settings.primaryColor, settings.accentColor);
}
