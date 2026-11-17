'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SecurityMap from '../../components/Map';
import AlertDrawer from '../../components/AlertDrawer';
import AuditLogModal from '../../components/AuditLogModal';
import { getStaffSession, clearStaffSession } from '../../lib/auth';
import { fetchActiveTrips, fetchAlerts } from '../../lib/api';
import { connectPanelSocket, disconnectPanelSocket } from '../../lib/socket';
import type { AnonymizedTrip, AlertItem, StaffUser } from '../../types';

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [trips, setTrips] = useState<AnonymizedTrip[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedTripToken, setSelectedTripToken] = useState<string | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Authentication check
  useEffect(() => {
    const session = getStaffSession();
    if (!session) {
      router.push('/');
    } else {
      setCurrentUser(session);
    }
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
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-white leading-none">CampusShield</h1>
            <p className="text-[10px] text-slate-400 mt-0.5">Live University Security Console</p>
          </div>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-full border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300 font-medium">{trips.length} Active Trips</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Privacy Escrow Active</span>
          </div>

          {activeAlertsCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-950/80 border border-red-500/50 rounded-full text-xs text-red-300 font-bold animate-pulse">
              <span>🚨</span>
              <span>{activeAlertsCount} Emergency Incidents</span>
            </div>
          )}
        </div>

        {/* User profile & actions */}
        <div className="flex items-center gap-3">
          {(currentUser.role === 'ADMIN' || currentUser.role === 'AUDITOR') && (
            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Audit Logs</span>
            </button>
          )}

          <div className="text-right text-xs">
            <div className="font-semibold text-slate-200">{currentUser.displayName || currentUser.email}</div>
            <div className="text-[10px] text-blue-400 font-mono tracking-wider">{currentUser.role}</div>
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

      {/* Main split view: Live Map on left, Alert Drawer on right */}
      <div className="flex-1 flex overflow-hidden relative">
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
      </div>

      {/* Audit Log Modal */}
      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />
    </div>
  );
}
