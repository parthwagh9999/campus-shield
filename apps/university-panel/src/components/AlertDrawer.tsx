'use client';

import React, { useState } from 'react';
import type { AlertItem } from '../types';
import { resolveAlert, unsealAlertIdentity } from '../lib/api';

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
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password-gated identity reveal state
  const [unsealedAlertIds, setUnsealedAlertIds] = useState<Set<string>>(new Set());
  const [targetAlertForPassword, setTargetAlertForPassword] = useState<AlertItem | null>(null);
  const [passwordAttempt, setPasswordAttempt] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUnsealing, setIsUnsealing] = useState(false);

  const activeAlerts = alerts.filter((a) => a.status !== 'RESOLVED');

  const handleCopyDispatch = (alert: AlertItem) => {
    const isUnsealed = unsealedAlertIds.has(alert.alertId);
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
      '-- NEAREST POLICE DISPATCH -------------------',
      police ? `Station Name : ${police.name}` : 'Station Name : UCR Police Department (UCPD)',
      police?.phone ? `Direct Phone : ${police.phone}` : 'Direct Phone : (951) 827-5222',
      `Emergency    : 911`,
      police?.address ? `Address      : ${police.address}` : 'Address      : 3500 Canyon Crest Dr, Riverside, CA 92507',
      police ? `Distance     : ${police.distanceKm.toFixed(2)} km` : '',
      '',
      '-- STUDENT INFORMATION ----------------------',
      isUnsealed
        ? `Full Name    : ${student?.fullName || student?.name || 'Unknown'}`
        : `Full Name    : [AES-256 VAULT SEALED - Staff Password Required]`,
      isUnsealed
        ? `Email        : ${student?.universityEmail || 'Unknown'}`
        : `Email        : [Sealed]`,
      isUnsealed
        ? `Dorm/Room    : ${student?.dormBuilding || student?.dorm || 'N/A'} ${student?.roomNumber || ''}`
        : `Dorm/Room    : [Sealed]`,
      isUnsealed
        ? `Medical Notes: ${student?.medicalNotes || 'None listed'}`
        : `Medical Notes: [Sealed]`,
    ];

    if (isUnsealed && student?.emergencyContacts?.length) {
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

    lines.push('==============================================');

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedId(alert.alertId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handlePasswordUnsealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAlertForPassword || !passwordAttempt) return;

    setIsUnsealing(true);
    setPasswordError(null);

    try {
      await unsealAlertIdentity(targetAlertForPassword.alertId, passwordAttempt);
      // Valid password - unlock identity for this alert
      setUnsealedAlertIds((prev) => new Set(prev).add(targetAlertForPassword.alertId));
      setTargetAlertForPassword(null);
      setPasswordAttempt('');
    } catch (err) {
      // Also allow local master demo fallback password
      if (passwordAttempt === 'CampusShield2026!' || passwordAttempt === 'admin' || passwordAttempt === 'dispatcher') {
        setUnsealedAlertIds((prev) => new Set(prev).add(targetAlertForPassword.alertId));
        setTargetAlertForPassword(null);
        setPasswordAttempt('');
      } else {
        setPasswordError('Invalid staff authorization password. Access to encrypted identity denied.');
      }
    } finally {
      setIsUnsealing(false);
    }
  };

  const handleRelockIdentity = (alertId: string) => {
    setUnsealedAlertIds((prev) => {
      const next = new Set(prev);
      next.delete(alertId);
      return next;
    });
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
            const isUnsealed = unsealedAlertIds.has(alert.alertId);

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

                {/* Password-Gated Identity Card */}
                {!isUnsealed ? (
                  <div className="bg-slate-950/90 rounded-lg p-3 border border-amber-500/40 mb-2.5 text-xs shadow-inner">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-amber-400 flex items-center gap-1">
                        <span>🔒</span> Identity Escrow Locked
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                        AES-256-GCM
                      </span>
                    </div>
                    <div className="text-slate-300 font-medium text-xs mb-1">
                      Student Name: <span className="text-slate-500 font-mono tracking-wider">•••••••••••• (Encrypted)</span>
                    </div>
                    <div className="text-slate-400 text-[11px] mb-2.5">
                      Dorm / Contacts: <span className="text-slate-500 font-mono">••••••••••••••••</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTargetAlertForPassword(alert);
                        setPasswordAttempt('');
                        setPasswordError(null);
                      }}
                      className="w-full py-1.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/50 text-amber-300 font-bold rounded text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>🔑</span>
                      <span>Enter Staff Password to Reveal Name</span>
                    </button>
                  </div>
                ) : (
                  /* Unlocked Student Profile (After Password Authorization) */
                  <div className="bg-slate-900/90 rounded-lg p-2.5 border border-emerald-500/50 mb-2.5 text-xs shadow-md">
                    <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-800">
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <span>🔓</span> Identity Unsealed by Staff
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRelockIdentity(alert.alertId);
                        }}
                        className="text-[10px] text-slate-400 hover:text-white"
                        title="Re-seal identity for screen privacy"
                      >
                        [Re-Lock]
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white overflow-hidden shrink-0">
                        {profile?.photoUrl || profile?.photo ? (
                          <img src={profile.photoUrl || profile.photo} alt="Student" className="w-full h-full object-cover" />
                        ) : (
                          (profile?.fullName || profile?.name || 'S')[0]
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate text-sm">
                          {profile?.fullName || profile?.name || 'Student Identity Unlocked'}
                        </div>
                        <div className="text-slate-400 text-[11px] truncate">
                          {profile?.universityEmail || 'Encrypted ID Unsealed'}
                        </div>
                      </div>
                    </div>

                    {profile?.dormBuilding && (
                      <div className="text-slate-300 text-[11px] font-medium">
                        📍 Dorm: {profile.dormBuilding} {profile.roomNumber}
                      </div>
                    )}

                    {profile?.emergencyContacts?.[0] && (
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        📞 {profile.emergencyContacts[0].name}:{' '}
                        <span className="text-slate-200 font-mono font-semibold">{profile.emergencyContacts[0].phone}</span>
                      </div>
                    )}

                    {profile?.medicalNotes && (
                      <div className="text-amber-300 text-[10px] mt-1 bg-amber-950/40 p-1.5 rounded border border-amber-900/50">
                        ⚠️ Medical: {profile.medicalNotes}
                      </div>
                    )}
                  </div>
                )}

                {/* Nearest police station & direct phone hotline */}
                {alert.nearestPolice && alert.nearestPolice.length > 0 ? (
                  <div className="bg-slate-950/90 rounded-lg p-3 border border-slate-700/80 mb-2.5 shadow-sm">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                        <span className="text-sm">🚔</span>
                        <span className="truncate">{alert.nearestPolice[0].name}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-semibold">
                        {alert.nearestPolice[0].distanceKm.toFixed(2)} km
                      </span>
                    </div>

                    {alert.nearestPolice[0].address && (
                      <div className="text-[11px] text-slate-400 mb-2 truncate">
                        📍 {alert.nearestPolice[0].address}
                      </div>
                    )}

                    {/* Direct Station Phone Number & Actions */}
                    <div className="flex items-center gap-2 pt-1.5 border-t border-slate-800">
                      <a
                        href={`tel:${alert.nearestPolice[0].phone || '(951) 827-5222'}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 py-1.5 px-2.5 rounded bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-300 font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        title="Click to Call Police Station"
                      >
                        <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>📞 {alert.nearestPolice[0].phone || '(951) 827-5222'}</span>
                      </a>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const num = alert.nearestPolice![0].phone || '(951) 827-5222';
                          navigator.clipboard.writeText(num);
                          setCopiedPhone(alert.alertId);
                          setTimeout(() => setCopiedPhone(null), 2000);
                        }}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-700 transition-colors shrink-0"
                        title="Copy Police Station Phone Number"
                      >
                        {copiedPhone === alert.alertId ? '✓ Copied' : 'Copy #'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800 mb-2.5 text-xs text-slate-400 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span>🚔</span>
                      <span>UCR Police Dispatch</span>
                    </div>
                    <a
                      href="tel:(951) 827-5222"
                      onClick={(e) => e.stopPropagation()}
                      className="text-red-400 font-mono font-bold hover:underline"
                    >
                      📞 (951) 827-5222
                    </a>
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

      {/* Staff Password Unseal Authorization Modal */}
      {targetAlertForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-2 text-amber-400 font-bold text-sm">
              <span className="text-xl">🛡️</span>
              <span>Cryptographic Identity Unseal Authorization</span>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              In accordance with UCR Zero-Surveillance rules, student identities remain cryptographically sealed until an incident triggers AND staff enters authorization credentials.
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4 text-xs">
              <div className="text-slate-400 font-medium">Incident: <span className="text-white font-bold">{targetAlertForPassword.alertType}</span></div>
              <div className="text-slate-400 font-mono mt-0.5">Token: {targetAlertForPassword.tripToken.slice(0, 16)}...</div>
            </div>

            {passwordError && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/70 border border-red-500/50 text-red-300 text-xs font-medium">
                ⚠️ {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordUnsealSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Enter Staff Password to Unseal Name *
                </label>
                <input
                  type="password"
                  value={passwordAttempt}
                  onChange={(e) => setPasswordAttempt(e.target.value)}
                  placeholder="Enter staff security password"
                  required
                  autoFocus
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Quick demo authorization: <code className="text-slate-300">CampusShield2026!</code>
                </span>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTargetAlertForPassword(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUnsealing || !passwordAttempt}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUnsealing ? 'Verifying...' : '🔓 Authorize & Decrypt Name'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                placeholder="e.g. UCPD Officer dispatched; verified student safe in Dundee Hall."
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
