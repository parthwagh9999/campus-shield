export interface StaffUser {
  staffId: string;
  email: string;
  role: 'DISPATCHER' | 'ADMIN' | 'AUDITOR';
  displayName: string | null;
  token: string;
}

export interface AnonymizedTrip {
  tripToken: string;
  lat: number;
  lng: number;
  status: 'ACTIVE' | 'GRACE_PERIOD' | 'ALERT_SOS' | 'ALERT_COERCION' | 'ALERT_PERIMETER_BREACH' | 'ALERT_MISSED_RETURN' | 'ALERT_MISSED_CHECKIN' | 'ALERT_LOW_BATTERY' | 'RESOLVED' | 'COMPLETED';
  batteryPct: number | null;
  updatedAt: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship?: string;
}

export interface UnlockedStudentProfile {
  studentId: string;
  universityEmail: string;
  fullName?: string;
  name?: string;
  photoUrl?: string;
  photo?: string;
  dormBuilding?: string;
  dorm?: string;
  roomNumber?: string;
  emergencyContacts?: EmergencyContact[];
  medicalNotes?: string;
}

export interface PoliceStation {
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  phone?: string;
  address?: string;
}

export interface AlertItem {
  alertId: string;
  tripToken: string;
  studentId: string | null;
  alertType: 'SOS' | 'COERCION' | 'PERIMETER_BREACH' | 'MISSED_RETURN' | 'MISSED_CHECKIN' | 'LOW_BATTERY';
  priority: number;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  decryptedProfile: UnlockedStudentProfile | null;
  lastKnownCoords: { lat: number; lng: number } | null;
  nearestPolice: PoliceStation[] | null;
  resolutionNote: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface AuditLogItem {
  id: number;
  tripToken: string;
  studentId: string | null;
  triggerReason: string;
  unlockedBy: string;
  details: Record<string, unknown> | null;
  unlockedAt: string;
}
