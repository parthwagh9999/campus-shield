import type {
  AnonymizedTrip,
  AlertItem,
  AuditLogItem,
  StaffUser,
  StudentListItem,
  CampusGeofence,
  UniversitySettings,
  TripDayPath,
} from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('cs_staff_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Trips & Alerts
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Student Management
// ---------------------------------------------------------------------------
export async function fetchStudents(opts?: { search?: string; dorm?: string; status?: string; limit?: number; offset?: number }): Promise<{ students: StudentListItem[]; total: number }> {
  const params = new URLSearchParams();
  if (opts?.search) params.append('search', opts.search);
  if (opts?.dorm) params.append('dorm', opts.dorm);
  if (opts?.status && opts.status !== 'ALL') params.append('status', opts.status);
  if (opts?.limit) params.append('limit', opts.limit.toString());
  if (opts?.offset) params.append('offset', opts.offset.toString());

  const res = await fetch(`${API_BASE}/api/v1/panel/students?${params.toString()}`, {
    headers: { ...getAuthHeader() },
  });

  if (!res.ok) throw new Error('Failed to fetch students directory');
  const json = await res.json();
  return {
    students: json.students || [],
    total: json.total || 0,
  };
}

export async function createStudent(data: {
  universityEmail: string;
  password?: string;
  profile: {
    fullName: string;
    dormBuilding?: string;
    roomNumber?: string;
    emergencyContacts: Array<{ name: string; phone: string; relationship: string }>;
    medicalNotes?: string;
  };
  checkinIntervalHours?: number;
}): Promise<StudentListItem> {
  const res = await fetch(`${API_BASE}/api/v1/panel/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to create student' }));
    throw new Error(error.error || 'Failed to create student');
  }

  const json = await res.json();
  return json.student;
}

export async function updateStudent(
  studentId: string,
  data: {
    universityEmail?: string;
    profile?: {
      fullName?: string;
      dormBuilding?: string;
      roomNumber?: string;
      medicalNotes?: string;
    };
    checkinIntervalHours?: number;
  },
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/panel/students/${studentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error('Failed to update student');
}

export async function deleteStudent(studentId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/panel/students/${studentId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });

  if (!res.ok) throw new Error('Failed to delete student');
}

export async function bulkImportStudents(students: any[]): Promise<{ importedCount: number }> {
  const res = await fetch(`${API_BASE}/api/v1/panel/students/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ students }),
  });

  if (!res.ok) throw new Error('Bulk import failed');
  return res.json();
}

// ---------------------------------------------------------------------------
// Geofences
// ---------------------------------------------------------------------------
export async function fetchGeofences(): Promise<CampusGeofence[]> {
  const res = await fetch(`${API_BASE}/api/v1/panel/geofences`, {
    headers: { ...getAuthHeader() },
  });

  if (!res.ok) throw new Error('Failed to fetch geofences');
  const json = await res.json();
  return json.geofences || [];
}

export async function createGeofence(data: Partial<CampusGeofence>): Promise<CampusGeofence> {
  const res = await fetch(`${API_BASE}/api/v1/panel/geofences`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error('Failed to create geofence');
  const json = await res.json();
  return json.geofence;
}

export async function deleteGeofence(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/panel/geofences/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });

  if (!res.ok) throw new Error('Failed to delete geofence');
}

// ---------------------------------------------------------------------------
// University Settings & Branding
// ---------------------------------------------------------------------------
export async function fetchUniversitySettings(): Promise<UniversitySettings> {
  const res = await fetch(`${API_BASE}/api/v1/panel/settings`, {
    headers: { ...getAuthHeader() },
  });

  if (!res.ok) throw new Error('Failed to fetch settings');
  const json = await res.json();
  return json.settings;
}

export async function updateUniversitySettings(data: Partial<UniversitySettings>): Promise<UniversitySettings> {
  const res = await fetch(`${API_BASE}/api/v1/panel/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error('Failed to update settings');
  const json = await res.json();
  return json.settings;
}

export async function unsealAlertIdentity(alertId: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/panel/alerts/${alertId}/unseal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Invalid staff password' }));
    throw new Error(data.error || 'Invalid staff authorization password');
  }
}

export async function fetchTripDayPath(tripToken: string): Promise<TripDayPath> {
  const res = await fetch(`${API_BASE}/api/v1/panel/trips/${tripToken}/path`, {
    headers: { ...getAuthHeader() },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch trip day trajectory path');
  }

  const json = await res.json();
  return json.path;
}

// ---------------------------------------------------------------------------
// Student Mobile & Onboarding API
// ---------------------------------------------------------------------------
export async function registerStudentMobile(data: {
  universityEmail: string;
  password?: string;
  profile: {
    fullName: string;
    dormBuilding: string;
    roomNumber?: string;
    emergencyContacts: Array<{ name: string; phone: string; relationship: string }>;
    medicalNotes?: string;
  };
  checkinIntervalHours?: number;
  factors?: Array<{ type: string; config?: Record<string, any> }>;
  order?: number[];
}): Promise<{ studentId: string; token: string }> {
  const res = await fetch(`${API_BASE}/api/v1/auth/student/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      password: data.password || 'SecureHighlander2026!',
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Registration failed' }));
    throw new Error(error.error || 'Registration failed');
  }

  return res.json();
}

export async function forgotStudentPassword(universityEmail: string): Promise<{ status: string; message: string; demoOtp: string }> {
  const res = await fetch(`${API_BASE}/api/v1/auth/student/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ universityEmail }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Password recovery failed' }));
    throw new Error(err.error || 'Password recovery failed');
  }

  return res.json();
}

export async function resetStudentPassword(data: {
  universityEmail: string;
  otp: string;
  newPassword?: string;
  newFactors?: Array<{ type: string }>;
}): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/v1/auth/student/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Password reset failed' }));
    throw new Error(err.error || 'Password reset failed');
  }

  return res.json();
}
