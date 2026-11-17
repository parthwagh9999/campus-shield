'use client';

import React, { useState } from 'react';
import type { AlertItem } from '../types';
import { resolveAlert } from '../lib/api';

interface AlertDrawerProps {
  alerts: AlertItem[];
  selectedTripToken: string | null;
  onSelectTrip: (tripToken: string) => void;
  onAlertResolved: () => void;
}

export default function AlertDrawer({
  alerts,
  selectedTripToken,
  onSelectTrip,
  onAlertResolved,
}: AlertDrawerProps) {
  const [resolvingAlert, setResolvingAlert] = useState<AlertItem | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeAlerts = alerts.filter((a) => a.status !== 'RESOLVED');

  const handleCopyDispatch = (alert: AlertItem) => {
    const student = alert.decryptedProfile;
    const police = alert.nearestPolice?.[0];
    const coords = alert.lastKnownCoords;

    const lines: string[] = [
      '==============================================',
      '  CAMPUSSHIELD - EMERGENCY DISPATCH SUMMARY',
      '==============================================',
      `Alert Type   : ${alert.alertType} (Priority ${alert.priority})`,
      `Trip Token   : ${alert.tripToken}`,
      `Timestamp    : ${new Date(alert.createdAt).toLocaleString()}`,
      '',
      '-- STUDENT INFORMATION (UNLOCKED) -----------',
      `Full Name    : ${student?.fullName || student?.name || 'Unknown'}`,
      `Email        : ${student?.universityEmail || 'Unknown'}`,
      `Dorm/Room    : ${student?.dormBuilding || student?.dorm || 'N/A'} ${student?.roomNumber || ''}`,
      `Medical Notes: ${student?.medicalNotes || 'None listed'}`,
    ];

    if (student?.emergencyContacts?.length) {
      lines.push('Emergency Contacts:');
      student.emergencyContacts.forEach((c) => {
        lines.push(`  • ${c.name} (${c.relationship || 'Contact'}): ${c.phone}`);
      });
    }

    lines.push('');
    lines.push('-- LOCATION DETAILS -------------------------');
    if (coords) {
      lines.push(`Coordinates  : ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
      lines.push(`Map URL      : https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=17/${coords.lat}/${coords.lng}`);
    } else {
      lines.push('Coordinates  : Unavailable');
    }

    lines.push('');
    lines.push('-- NEAREST POLICE STATION -------------------');
    if (police) {
      lines.push(`Station Name : ${police.name}`);
      lines.push(`Distance     : ${police.distanceKm.toFixed(2)} km`);
      if (police.phone) lines.push(`Phone        : ${police.phone}`);
      if (police.address) lines.push(`Address      : ${police.address}`);
    } else {
      lines.push('Nearest police query in progress or outside range');
    }

    lines.push('==============================================');

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedId(alert.alertId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingAlert || !resolutionNote.trim()) return;

    setIsSubmitting(true);
    try {
      await resolveAlert(resolvingAlert.tripToken, resolutionNote);
      setResolvingAlert(null);
      setResolutionNote('');
      onAlertResolved();
    } catch (err) {
      alert('Failed to resolve alert: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-96 h-full bg-slate-900 border-l border-slate-800 flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <h2 className="font-semibold text-white text-sm">Emergency Alert Queue</h2>
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-950/80 border border-red-500/40 text-red-400">
          {activeAlerts.length} Active
        </span>
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeAlerts.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center text-slate-500 p-4">
            <svg className="w-8 h-8 text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-sm font-medium">All Clear</p>
            <p className="text-xs text-slate-600 mt-0.5">No active safety alerts or emergency triggers.</p>
          </div>
        ) : (
          activeAlerts.map((alert) => {
            const isSelected = selectedTripToken === alert.tripToken;
            const profile = alert.decryptedProfile;

            return (
              <div
                key={alert.alertId}
                onClick={() => onSelectTrip(alert.tripToken)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/90 border-blue-500/60 shadow-lg ring-1 ring-blue-500/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Trigger badge & priority */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase ${
                      alert.alertType === 'COERCION'
                        ? 'bg-purple-950 border border-purple-500 text-purple-300'
                        : alert.alertType === 'SOS'
                        ? 'bg-red-950 border border-red-500 text-red-300'
                        : alert.alertType === 'PERIMETER_BREACH'
                        ? 'bg-amber-950 border border-amber-500 text-amber-300'
                        : 'bg-blue-950 border border-blue-500 text-blue-300'
                    }`}
                  >
                    {alert.alertType === 'COERCION' ? '🚨 Silent Coercion SOS' : alert.alertType}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(alert.createdAt).toLocaleTimeString()}
                  </span>
                </div>

                {/* Unlocked Student Profile */}
                <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800/80 mb-2.5 text-xs">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 overflow-hidden shrink-0">
                      {profile?.photoUrl || profile?.photo ? (
                        <img src={profile.photoUrl || profile.photo} alt="Student" className="w-full h-full object-cover" />
                      ) : (
                        (profile?.fullName || profile?.name || 'S')[0]
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">
                        {profile?.fullName || profile?.name || 'Student Identity Unlocked'}
                      </div>
                      <div className="text-slate-400 text-[11px] truncate">
                        {profile?.universityEmail || 'Encrypted ID Unsealed'}
                      </div>
                    </div>
                  </div>

                  {profile?.dormBuilding && (
                    <div className="text-slate-400 text-[11px]">
                      📍 Dorm: {profile.dormBuilding} {profile.roomNumber}
                    </div>
                  )}

                  {profile?.emergencyContacts?.[0] && (
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      📞 {profile.emergencyContacts[0].name}:{' '}
                      <span className="text-slate-200 font-mono">{profile.emergencyContacts[0].phone}</span>
                    </div>
                  )}
                </div>

                {/* Nearest police station */}
                {alert.nearestPolice?.[0] && (
                  <div className="text-[11px] text-slate-400 mb-2.5 flex items-center gap-1.5 bg-slate-900/40 p-2 rounded border border-slate-800/50">
                    <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="truncate">
                      Nearest: <strong className="text-slate-300">{alert.nearestPolice[0].name}</strong> ({alert.nearestPolice[0].distanceKm.toFixed(1)} km)
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyDispatch(alert);
                    }}
                    className="flex-1 py-1.5 px-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>{copiedId === alert.alertId ? 'Copied!' : 'Copy Dispatch'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setResolvingAlert(alert);
                    }}
                    className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 text-xs font-medium transition-colors"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Resolve Incident Modal */}
      {resolvingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Resolve Incident</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter official resolution notes before closing alert for Trip Token:{' '}
              <span className="font-mono text-slate-300">{resolvingAlert.tripToken.slice(0, 8)}</span>
            </p>

            <form onSubmit={handleResolveSubmit}>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="e.g. Officer Johnson dispatched; student confirmed safe in dorm; false alarm confirmed via phone."
                rows={4}
                required
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !resolutionNote.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
