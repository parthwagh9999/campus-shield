export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface StudentProfile {
  fullName: string;
  universityEmail: string;
  dormBuilding?: string;
  roomNumber?: string;
  emergencyContacts: EmergencyContact[];
  medicalNotes?: string;
}

export interface ActiveTrip {
  tripToken: string;
  returnDeadline: string;
  status: 'ACTIVE' | 'GRACE_PERIOD' | 'ALERT_SOS' | 'COMPLETED';
  perimeterRadiusMeters?: number;
}

export type FactorType = 0 | 1 | 2; // 0=PIN, 1=Pattern, 2=Passphrase

export interface AuthState {
  token: string | null;
  studentId: string | null;
  universityEmail: string | null;
  checkinIntervalHours: number;
  nextCheckinDue: string | null;
  factorsConfigured: boolean;
  activeTrip: ActiveTrip | null;
}
