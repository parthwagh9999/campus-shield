import { useAppStore } from '../store';

const API_BASE = 'http://10.0.2.2:3001'; // Default emulator mapping; adjustable for physical device

function getHeaders(): Record<string, string> {
  const token = useAppStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  async register(data: {
    universityEmail: string;
    password: string;
    profile: {
      fullName: string;
      dormBuilding?: string;
      roomNumber?: string;
      emergencyContacts: Array<{ name: string; phone: string; relationship: string }>;
      medicalNotes?: string;
    };
    checkinIntervalHours?: number;
  }) {
    const res = await fetch(`${API_BASE}/api/v1/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(err.error || 'Registration failed');
    }
    return res.json();
  },

  async login(universityEmail: string, password: string) {
    const res = await fetch(`${API_BASE}/api/v1/auth/student/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ universityEmail, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || 'Invalid credentials');
    }
    return res.json();
  },

  async saveFactors(pin: string, pattern: string, passphrase: string, expectedOrder: [number, number, number]) {
    const res = await fetch(`${API_BASE}/api/v1/auth/student/factors`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ pin, pattern, passphrase, expectedOrder }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to save factors' }));
      throw new Error(err.error || 'Failed to save factors');
    }
    return res.json();
  },

  async verifyCheckin(inputs: [string, string, string]) {
    const res = await fetch(`${API_BASE}/api/v1/checkin/verify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ inputs }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Wrong password, please try again' }));
      throw new Error(err.error || 'Check-in verification failed');
    }
    return res.json(); // { status: "APPROVED" }
  },

  async startTrip(data: {
    perimeter: {
      type: 'Polygon';
      coordinates: number[][][];
    };
    destination: {
      type: 'Point';
      coordinates: [number, number];
    };
    returnDeadline: string;
  }) {
    const res = await fetch(`${API_BASE}/api/v1/trips/start`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to start trip' }));
      throw new Error(err.error || 'Failed to start trip');
    }
    return res.json() as Promise<{ tripToken: string }>;
  },

  async sendPing(data: {
    tripToken: string;
    lat: number;
    lng: number;
    batteryPct: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
  }) {
    const res = await fetch(`${API_BASE}/api/v1/trips/ping`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return res.json() as Promise<{ insidePerimeter: boolean; tripStatus: string }>;
  },

  async triggerSOS(tripToken: string) {
    const res = await fetch(`${API_BASE}/api/v1/trips/sos`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ tripToken }),
    });
    if (!res.ok) throw new Error('SOS trigger failed');
    return res.json();
  },

  async endTrip(tripToken: string) {
    const res = await fetch(`${API_BASE}/api/v1/trips/end`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ tripToken }),
    });
    if (!res.ok) throw new Error('Failed to end trip');
    return res.json();
  },
};
