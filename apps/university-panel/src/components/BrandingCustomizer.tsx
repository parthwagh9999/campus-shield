'use client';

import React, { useState, useEffect } from 'react';
import type { UniversitySettings } from '../types';
import {
  PRESET_THEMES,
  DEFAULT_SETTINGS,
  loadSavedSettings,
  saveLocalSettings,
  applyThemeVariables,
} from '../lib/theme';
import { updateUniversitySettings } from '../lib/api';

interface BrandingCustomizerProps {
  onSettingsChanged?: (settings: UniversitySettings) => void;
}

export default function BrandingCustomizer({ onSettingsChanged }: BrandingCustomizerProps) {
  const [settings, setSettings] = useState<UniversitySettings>(DEFAULT_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const current = loadSavedSettings();
    setSettings(current);
  }, []);

  const handleSelectPreset = (presetId: string) => {
    const preset = PRESET_THEMES.find((p) => p.id === presetId);
    if (!preset) return;

    const updated: UniversitySettings = {
      ...settings,
      themePreset: preset.id,
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
    };
    setSettings(updated);
    applyThemeVariables(updated.primaryColor, updated.accentColor);
  };

  const handleCustomPrimary = (color: string) => {
    const updated = { ...settings, primaryColor: color };
    setSettings(updated);
    applyThemeVariables(color, settings.accentColor);
  };

  const handleCustomAccent = (color: string) => {
    const updated = { ...settings, accentColor: color };
    setSettings(updated);
    applyThemeVariables(settings.primaryColor, color);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    saveLocalSettings(settings);

    try {
      await updateUniversitySettings(settings);
    } catch {
      // Local storage persistence works offline
    }

    onSettingsChanged?.(settings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleReset = () => {
    if (!confirm('Reset all branding and colors to default Cyber Shield?')) return;
    setSettings(DEFAULT_SETTINGS);
    saveLocalSettings(DEFAULT_SETTINGS);
    onSettingsChanged?.(DEFAULT_SETTINGS);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950 p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <span>University Branding & Color Palette Customizer</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tailor the CampusShield portal to match your university's official color palette, seal, and contact hotlines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              ✓ Saved & Applied
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700"
          >
            Reset Defaults
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
        {/* Section 1: Color Palette Presets */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-1">Official University Color Palettes</h3>
          <p className="text-xs text-slate-400 mb-4">
            Select an institution preset or customize individual brand tones below.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PRESET_THEMES.map((theme) => {
              const isSelected = settings.primaryColor === theme.primaryColor;

              return (
                <div
                  key={theme.id}
                  onClick={() => handleSelectPreset(theme.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-white shadow-lg ring-1 ring-white/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-5 h-5 rounded-full border border-white/20 shadow-inner"
                      style={{ backgroundColor: theme.primaryColor }}
                    />
                    <span
                      className="w-5 h-5 rounded-full border border-white/20 shadow-inner"
                      style={{ backgroundColor: theme.accentColor }}
                    />
                  </div>
                  <div className="font-semibold text-white text-xs">{theme.name}</div>
                </div>
              );
            })}
          </div>

          {/* Custom Pickers */}
          <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-800 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">
                Primary Brand Color (Navigation, Buttons, Pins)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => handleCustomPrimary(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) => handleCustomPrimary(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">
                Secondary Accent Color (Badges, Active Indicators)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => handleCustomAccent(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={settings.accentColor}
                  onChange={(e) => handleCustomAccent(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono uppercase"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Institution Branding Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs">
          <h3 className="text-sm font-bold text-white mb-1">University Identity & Header</h3>
          <p className="text-xs text-slate-400 mb-4">
            Customizes the title displayed on staff consoles and student safety receipts.
          </p>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-slate-400 font-semibold mb-1">Official University Name *</label>
              <input
                type="text"
                required
                value={settings.universityName}
                onChange={(e) => setSettings({ ...settings, universityName: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Short Acronym</label>
              <input
                type="text"
                value={settings.universityShortName}
                onChange={(e) => setSettings({ ...settings, universityShortName: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono uppercase"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Safety Lines & Hotlines */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs">
          <h3 className="text-sm font-bold text-white mb-1">Campus Emergency Dispatch Numbers</h3>
          <p className="text-xs text-slate-400 mb-4">
            Auto-populated in student emergency dispatch summaries and mobile one-tap hotlines.
          </p>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Campus Police Emergency Line</label>
              <input
                type="text"
                value={settings.campusPolicePhone}
                onChange={(e) => setSettings({ ...settings, campusPolicePhone: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Night SafeRide / Escort Van</label>
              <input
                type="text"
                value={settings.studentEscortPhone}
                onChange={(e) => setSettings({ ...settings, studentEscortPhone: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Student Crisis & Counseling</label>
              <input
                type="text"
                value={settings.counselingHotline}
                onChange={(e) => setSettings({ ...settings, counselingHotline: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Live Preview Card */}
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Live Console Branding Preview
          </div>
          <div
            className="p-4 rounded-xl border flex items-center justify-between"
            style={{
              backgroundColor: '#020617',
              borderColor: settings.primaryColor,
              boxShadow: `0 0 15px ${settings.primaryColor}30`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm"
                style={{ backgroundColor: settings.primaryColor }}
              >
                {settings.universityShortName || 'CS'}
              </div>
              <div>
                <div className="font-bold text-white text-sm">{settings.universityName}</div>
                <div className="text-xs text-slate-400">Security Operations & Escrow Active</div>
              </div>
            </div>

            <div
              className="px-3 py-1 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: settings.accentColor }}
            >
              Emergency Hotline: {settings.campusPolicePhone}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 font-bold text-white text-xs rounded-xl shadow-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Save & Apply University Branding</span>
          </button>
        </div>
      </form>
    </div>
  );
}
