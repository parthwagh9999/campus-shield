import type { StaffUser } from '../types';

const TOKEN_KEY = 'cs_staff_token';
const USER_KEY = 'cs_staff_user';

export function saveStaffSession(user: StaffUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, user.token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStaffSession(): StaffUser | null {
  if (typeof window === 'undefined') return null;
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

export function clearStaffSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
