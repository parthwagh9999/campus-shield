'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SecurityMap from '../../components/Map';
import AlertDrawer from '../../components/AlertDrawer';
import AuditLogModal from '../../components/AuditLogModal';
import StudentDirectory from '../../components/StudentDirectory';
import GeofenceManager from '../../components/GeofenceManager';
import BrandingCustomizer from '../../components/BrandingCustomizer';
import IncidentHistory from '../../components/IncidentHistory';
import { getStaffSession, clearStaffSession } from '../../lib/auth';
import { fetchActiveTrips, fetchAlerts, fetchUniversitySettings } from '../../lib/api';
import { connectPanelSocket, disconnectPanelSocket } from '../../lib/socket';
import { loadSavedSettings, applyThemeVariables, DEFAULT_SETTINGS } from '../../lib/theme';
import type { AnonymizedTrip, AlertItem, StaffUser, UniversitySettings } from '../../types';

type TabType = 'operations' | 'students' | 'geofences' | 'incidents' | 'branding';

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('operations');
  const [settings, setSettings] = useState<UniversitySettings>(DEFAULT_SETTINGS);
  const [trips, setTrips] = useState<AnonymizedTrip[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedTripToken, setSelectedTripToken] = useState<string | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Authentication check & initial settings load
  useEffect(() => {
    const session = getStaffSession();
    if (!session) {
      router.push('/');
    } else {
      setCurrentUser(session);
    }

    const localSettings = loadSavedSettings();
    setSettings(localSettings);
    applyThemeVariables(localSettings.primaryColor, localSettings.accentColor);

    fetchUniversitySettings()
      .then((remote) => {
        if (remote) {
          setSettings(remote);
          applyThemeVariables(remote.primaryColor, remote.accentColor);
        }
      })
      .catch(() => {});
  }, [router]);

  // Initial load
  const loadData = useCallback(async () => {
    try {
      const [tripsData, alertsData] = await Promise.all([
        fetchActiveTrips().catch(() => []),
        fetchAlerts().catch(() => []),
      ]);
      setTrips(tripsData);
      setAlerts(alertsData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    loadData();

    // Setup Socket.IO real-time connection
    const socket = connectPanelSocket(
      currentUser.token,
      (ping) => {
        setTrips((prev) => {
          const index = prev.findIndex((t) => t.tripToken === ping.tripToken);
          if (index >= 0) {
            const next = [...prev];
            next[index] = { ...next[index], ...ping };
            return next;
          }
          return [ping, ...prev];
        });
      },
      (newAlert) => {
        setAlerts((prev) => {
          const exists = prev.some((a) => a.alertId === newAlert.alertId);
          if (exists) return prev;
          return [newAlert, ...prev];
        });
        setSelectedTripToken(newAlert.tripToken);
      },
      ({ tripToken }) => {
        setAlerts((prev) => prev.filter((a) => a.tripToken !== tripToken));
        setTrips((prev) => prev.filter((t) => t.tripToken !== tripToken));
      },
    );

    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);

    return () => {
      clearInterval(interval);
      disconnectPanelSocket();
    };
  }, [currentUser, loadData]);

  const handleLogout = () => {
    clearStaffSession();
    router.push('/');
  };

  const handleSettingsChanged = (newSettings: UniversitySettings) => {
    setSettings(newSettings);
    applyThemeVariables(newSettings.primaryColor, newSettings.accentColor);
  };

  if (!currentUser) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Authenticating...
      </div>
    );
  }

  const activeAlertsCount = alerts.filter((a) => a.status !== 'RESOLVED').length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950">
      {/* Top Navigation Bar */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between z-20 shrink-0">
        {/* Left: Branding & Acronym */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-md transition-all duration-300"
            style={{
              backgroundColor: settings.primaryColor || '#003B5C',
              boxShadow: `0 0 12px ${settings.primaryColor}50`,
            }}
          >
            {settings.universityShortName || 'UCR'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-wide text-white leading-none">
                {settings.universityName || 'University of California, Riverside'}
              </h1>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                Console
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Zero-Surveillance Escrow Operations</p>
          </div>
        </div>

        {/* Center: Main Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('operations')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'operations'
                ? 'text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            style={
              activeTab === 'operations'
                ? { backgroundColor: settings.primaryColor }
                : undefined
            }
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>Live Map</span>
            {trips.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-slate-900/60 text-[10px] flex items-center justify-center font-mono">
                {trips.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'students'
                ? 'text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            style={
              activeTab === 'students'
                ? { backgroundColor: settings.primaryColor }
                : undefined
            }
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Student Registry</span>
          </button>

          <button
            onClick={() => setActiveTab('geofences')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'geofences'
                ? 'text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            style={
              activeTab === 'geofences'
                ? { backgroundColor: settings.primaryColor }
                : undefined
            }
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Safe Corridors</span>
          </button>

          <button
            onClick={() => setActiveTab('incidents')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'incidents'
                ? 'text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            style={
              activeTab === 'incidents'
                ? { backgroundColor: settings.primaryColor }
                : undefined
            }
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Incident Ledger</span>
            {activeAlertsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold animate-pulse">
                {activeAlertsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('branding')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'branding'
                ? 'text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            style={
              activeTab === 'branding'
                ? { backgroundColor: settings.primaryColor }
                : undefined
            }
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <span>Branding & Colors</span>
          </button>
        </nav>

        {/* Right side: Police Hotline, Audit logs, user info & actions */}
        <div className="flex items-center gap-3">
          {/* Dedicated Campus Police Hotline Button */}
          <a
            href={`tel:${settings.campusPolicePhone || '(951) 827-5222'}`}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-300 transition-colors shadow-sm"
            title="Direct Dial Campus Police Emergency Line"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>Police: {settings.campusPolicePhone || '(951) 827-5222'}</span>
          </a>

          {(currentUser.role === 'ADMIN' || currentUser.role === 'AUDITOR') && (
            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Audit Logs</span>
            </button>
          )}

          <div className="text-right text-xs">
            <div className="font-semibold text-slate-200">{currentUser.displayName || currentUser.email}</div>
            <div
              className="text-[10px] font-mono tracking-wider font-semibold uppercase"
              style={{ color: settings.accentColor || '#10b981' }}
            >
              {currentUser.role}
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content Area based on Active Tab */}
      <div className="flex-1 flex overflow-hidden relative">
        {activeTab === 'operations' && (
          <>
            <main className="flex-1 h-full relative">
              <SecurityMap
                trips={trips}
                alerts={alerts}
                selectedTripToken={selectedTripToken}
                onSelectTrip={(token) => setSelectedTripToken(token)}
              />
            </main>

            <AlertDrawer
              alerts={alerts}
              selectedTripToken={selectedTripToken}
              onSelectTrip={(token) => setSelectedTripToken(token)}
              onAlertResolved={loadData}
            />
          </>
        )}

        {activeTab === 'students' && <StudentDirectory />}

        {activeTab === 'geofences' && <GeofenceManager />}

        {activeTab === 'incidents' && <IncidentHistory alerts={alerts} />}

        {activeTab === 'branding' && (
          <BrandingCustomizer onSettingsChanged={handleSettingsChanged} />
        )}
      </div>

      {/* Audit Log Modal */}
      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />
    </div>
  );
}
