'use client';

import React, { useEffect, useState } from 'react';
import type { AuditLogItem } from '../types';
import { fetchAuditLogs } from '../lib/api';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuditLogModal({ isOpen, onClose }: AuditLogModalProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggerFilter, setTriggerFilter] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);

    fetchAuditLogs(50, 0, triggerFilter || undefined)
      .then((res) => setLogs(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen, triggerFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Identity Vault — Immutable Unlock Audit Logs</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Strictly append-only log of every event that decrypted student identity data. Protected by DB trigger.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center gap-3 text-xs">
          <span className="text-slate-400">Filter Trigger:</span>
          {['', 'SOS', 'COERCION', 'PERIMETER_BREACH', 'MISSED_RETURN', 'MISSED_CHECKIN', 'LOW_BATTERY'].map((trig) => (
            <button
              key={trig}
              onClick={() => setTriggerFilter(trig)}
              className={`px-2.5 py-1 rounded transition-colors ${
                triggerFilter === trig
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {trig || 'All Events'}
            </button>
          ))}
        </div>

        {/* Content table */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Loading audit logs...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-400 text-sm">{error}</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">No identity unlock events recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Log ID</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Trigger Reason</th>
                    <th className="py-2.5 px-3">Trip Token</th>
                    <th className="py-2.5 px-3">Unlocked By</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 text-slate-400">#{log.id}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-300">
                        {new Date(log.unlockedAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.triggerReason === 'COERCION'
                              ? 'bg-purple-950 text-purple-400 border border-purple-800'
                              : log.triggerReason === 'SOS'
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {log.triggerReason}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {log.tripToken.slice(0, 8)}...
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{log.unlockedBy}</td>
                      <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
