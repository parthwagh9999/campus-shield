'use client';

import React, { useState } from 'react';
import type { AlertItem } from '../types';

interface IncidentHistoryProps {
  alerts: AlertItem[];
}

export default function IncidentHistory({ alerts }: IncidentHistoryProps) {
  // Demo resolved archive entries for UCR Campus historical triage
  const defaultResolvedArchive: AlertItem[] = [
    {
      alertId: 'hist-ucr-001',
      tripToken: 'c4b8b6e2-7634-4a41-b016-1f9fbe3c1622',
      studentId: 'student-uuid-demo-002',
      alertType: 'PERIMETER_BREACH',
      priority: 2,
      status: 'RESOLVED',
      decryptedProfile: {
        studentId: 'student-uuid-demo-002',
        universityEmail: 'achen@ucr.edu',
        fullName: 'Alex Chen',
        dormBuilding: 'Aberdeen-Inverness (A&I)',
        roomNumber: 'B-205',
        emergencyContacts: [{ name: 'Grace Chen', phone: '(951) 555-0199', relationship: 'Mother' }],
      },
      lastKnownCoords: { lat: 33.9740, lng: -117.3275 },
      nearestPolice: [
        {
          name: 'UC Riverside Police Department (UCPD)',
          distanceKm: 0.28,
          phone: '(951) 827-5222',
          address: '3500 Canyon Crest Dr, Riverside, CA 92507',
          lat: 33.9744,
          lng: -117.3248,
        },
      ],
      resolutionNote: 'Student took wrong transit loop near University Village. Contacted via UCPD dispatch phone and verified safe arrival at A&I residence hall.',
      resolvedBy: 'Officer Martinez (UCPD Badge #402)',
      resolvedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 4.5 * 60 * 60 * 1000).toISOString(),
    },
    {
      alertId: 'hist-ucr-002',
      tripToken: 'a94c11b0-2f31-4122-87ce-00124fe991a2',
      studentId: 'student-uuid-demo-004',
      alertType: 'MISSED_RETURN',
      priority: 2,
      status: 'RESOLVED',
      decryptedProfile: {
        studentId: 'student-uuid-demo-004',
        universityEmail: 'loconnor@ucr.edu',
        fullName: 'Liam O’Connor',
        dormBuilding: 'Glen Mor Student Apartments',
        roomNumber: 'Building K-118',
        emergencyContacts: [{ name: 'Fiona O’Connor', phone: '(951) 555-0131', relationship: 'Parent' }],
      },
      lastKnownCoords: { lat: 33.9765, lng: -117.3320 },
      nearestPolice: [
        {
          name: 'UC Riverside Police Department (UCPD)',
          distanceKm: 0.45,
          phone: '(951) 827-5222',
          address: '3500 Canyon Crest Dr, Riverside, CA 92507',
          lat: 33.9744,
          lng: -117.3248,
        },
      ],
      resolutionNote: 'Orbach Science Library late-night study group ran past return timer. Verified safe in person via UCR Highlander Escort patrol.',
      resolvedBy: 'Officer Johnson (UCPD Badge #318)',
      resolvedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const resolvedAlerts = [
    ...alerts.filter((a) => a.status === 'RESOLVED'),
    ...defaultResolvedArchive,
  ];

  const [selectedIncident, setSelectedIncident] = useState<AlertItem | null>(null);
  const [copiedPoliceId, setCopiedPoliceId] = useState<string | null>(null);

  const handleExportCSV = () => {
    const headers = [
      'IncidentID',
      'Type',
      'Priority',
      'StudentName',
      'Email',
      'Dorm',
      'NearestPoliceStation',
      'PoliceStationPhone',
      'CreatedAt',
      'ResolvedAt',
      'ResolvedBy',
      'ResolutionNote',
    ];

    const rows = resolvedAlerts.map((a) => [
      a.alertId,
      a.alertType,
      a.priority,
      `"${a.decryptedProfile?.fullName || 'Anonymous'}"`,
      a.decryptedProfile?.universityEmail || 'N/A',
      `"${a.decryptedProfile?.dormBuilding || 'N/A'}"`,
      `"${a.nearestPolice?.[0]?.name || 'UCR Police Dept (UCPD)'}"`,
      `"${a.nearestPolice?.[0]?.phone || '(951) 827-5222'}"`,
      a.createdAt,
      a.resolvedAt || 'N/A',
      `"${a.resolvedBy || 'Officer'}"`,
      `"${a.resolutionNote?.replace(/"/g, '""') || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `UCR_CampusShield_Incident_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950 p-6">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span>Emergency Incident Archive & Triage Ledger</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Historical ledger of resolved safety triggers, dispatched officers, and nearest police station contact hotlines.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 btn-brand-primary rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md"
          >
            <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export CSV Report</span>
          </button>
        </div>

        {/* Table of incidents */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-4">Incident ID</th>
                <th className="py-2.5 px-4">Trigger Type</th>
                <th className="py-2.5 px-4">Student</th>
                <th className="py-2.5 px-4">Nearest Police & Dispatch Hotline</th>
                <th className="py-2.5 px-4">Trigger Time</th>
                <th className="py-2.5 px-4">Resolved By</th>
                <th className="py-2.5 px-4">Resolution Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {resolvedAlerts.map((incident) => {
                const policeStation = incident.nearestPolice?.[0] || {
                  name: 'UC Riverside Police Department (UCPD)',
                  phone: '(951) 827-5222',
                  distanceKm: 0.28,
                };

                return (
                  <tr
                    key={incident.alertId}
                    onClick={() => setSelectedIncident(incident)}
                    className="hover:bg-slate-900/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {incident.alertId.slice(0, 12)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                        {incident.alertType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{incident.decryptedProfile?.fullName || 'Student'}</div>
                      <div className="text-[11px] text-slate-400">{incident.decryptedProfile?.universityEmail}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200 truncate max-w-xs">{policeStation.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <a
                          href={`tel:${policeStation.phone || '(951) 827-5222'}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] font-mono font-bold text-red-400 hover:text-red-300 hover:underline flex items-center gap-1"
                          title="Direct Call Police Station"
                        >
                          📞 {policeStation.phone || '(951) 827-5222'}
                        </a>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({policeStation.distanceKm.toFixed(2)} km)
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(incident.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {incident.resolvedBy || 'Officer'}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                      {incident.resolutionNote || 'Verified safe.'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident Detail Drawer */}
      {selectedIncident && (
        <div className="w-88 border-l border-slate-800 bg-slate-900 p-5 flex flex-col shrink-0 overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400">Incident Details</span>
            <button onClick={() => setSelectedIncident(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Incident Type & Priority</span>
              <span className="font-bold text-white text-sm block mt-0.5">{selectedIncident.alertType} (Priority {selectedIncident.priority})</span>
              <span className="text-[10px] text-emerald-400 font-semibold">Status: RESOLVED</span>
            </div>

            {/* Nearest Police Station Section with Phone */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-700/80">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">
                Dispatched Police Station & Phone
              </span>
              <div className="font-bold text-white text-xs mb-1">
                🚔 {selectedIncident.nearestPolice?.[0]?.name || 'UC Riverside Police Department (UCPD)'}
              </div>
              {selectedIncident.nearestPolice?.[0]?.address && (
                <div className="text-[11px] text-slate-400 mb-2 truncate">
                  📍 {selectedIncident.nearestPolice[0].address}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <a
                  href={`tel:${selectedIncident.nearestPolice?.[0]?.phone || '(951) 827-5222'}`}
                  className="flex-1 py-1.5 px-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-300 font-mono font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>📞 {selectedIncident.nearestPolice?.[0]?.phone || '(951) 827-5222'}</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const num = selectedIncident.nearestPolice?.[0]?.phone || '(951) 827-5222';
                    navigator.clipboard.writeText(num);
                    setCopiedPoliceId(selectedIncident.alertId);
                    setTimeout(() => setCopiedPoliceId(null), 2000);
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                >
                  {copiedPoliceId === selectedIncident.alertId ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Involved Student</span>
              <span className="font-semibold text-white block mt-0.5">{selectedIncident.decryptedProfile?.fullName}</span>
              <span className="text-slate-400 block">{selectedIncident.decryptedProfile?.universityEmail}</span>
              <span className="text-slate-400 block mt-0.5">Dorm: {selectedIncident.decryptedProfile?.dormBuilding || 'Off-Campus'}</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Officer Resolution Notes</span>
              <p className="text-slate-300 leading-relaxed mt-1">{selectedIncident.resolutionNote}</p>
              <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-900">
                Resolved by: <span className="text-slate-300 font-medium">{selectedIncident.resolvedBy}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
