import type { AnonymizedTrip, AlertItem, AuditLogItem, StaffUser } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('cs_staff_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function loginStaff(email: string, password: string, totpCode?: string): Promise<StaffUser> {
  const res = await fetch(`${API_BASE}/api/v1/auth/staff/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, totpCode }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(error.error || 'Login failed');
  }

  return res.json();
}

export async function fetchActiveTrips(): Promise<AnonymizedTrip[]> {
  const res = await fetch(`${API_BASE}/api/v1/panel/trips/active`, {
    headers: { ...getAuthHeader() },
  });

  if (!res.ok) throw new Error('Failed to fetch active trips');
  const data = await res.json();
  return data.trips || [];
}

export async function fetchAlerts(): Promise<AlertItem[]> {
  const res = await fetch(`${API_BASE}/api/v1/panel/alerts`, {
    headers: { ...getAuthHeader() },
  });

  if (!res.ok) throw new Error('Failed to fetch alerts');
  const data = await res.json();
  return data.alerts || [];
}

export async function resolveAlert(tripToken: string, resolutionNote: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/panel/alerts/${tripToken}/resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ resolutionNote }),
  });

  if (!res.ok) throw new Error('Failed to resolve alert');
}

export async function fetchAuditLogs(limit = 50, offset = 0, triggerReason?: string): Promise<{ data: AuditLogItem[]; total: number }> {
  let url = `${API_BASE}/api/v1/panel/audit-logs?limit=${limit}&offset=${offset}`;
  if (triggerReason) url += `&triggerReason=${triggerReason}`;

  const res = await fetch(url, {
    headers: { ...getAuthHeader() },
  });

  if (!res.ok) throw new Error('Failed to fetch audit logs');
  const json = await res.json();
  return {
    data: json.data || [],
    total: json.pagination?.total || 0,
  };
}
