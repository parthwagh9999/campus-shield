import { create } from 'zustand';
import type { AuthState, ActiveTrip } from '../types';

interface AppStore extends AuthState {
  setAuth: (payload: {
    token: string;
    studentId: string;
    universityEmail: string;
    checkinIntervalHours: number;
    nextCheckinDue: string | null;
  }) => void;
  setFactorsConfigured: (configured: boolean) => void;
  setCheckinDue: (due: string) => void;
  setActiveTrip: (trip: ActiveTrip | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  token: null,
  studentId: null,
  universityEmail: null,
  checkinIntervalHours: 48,
  nextCheckinDue: null,
  factorsConfigured: false,
  activeTrip: null,

  setAuth: (payload) =>
    set({
      token: payload.token,
      studentId: payload.studentId,
      universityEmail: payload.universityEmail,
      checkinIntervalHours: payload.checkinIntervalHours,
      nextCheckinDue: payload.nextCheckinDue,
    }),

  setFactorsConfigured: (configured) => set({ factorsConfigured: configured }),

  setCheckinDue: (due) => set({ nextCheckinDue: due }),

  setActiveTrip: (trip) => set({ activeTrip: trip }),

  logout: () =>
    set({
      token: null,
      studentId: null,
      universityEmail: null,
      nextCheckinDue: null,
      factorsConfigured: false,
      activeTrip: null,
    }),
}));
