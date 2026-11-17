import { io, Socket } from 'socket.io-client';
import type { AnonymizedTrip, AlertItem } from '../types';

let socket: Socket | null = null;

export function connectPanelSocket(
  token: string,
  onPing: (ping: AnonymizedTrip) => void,
  onAlert: (alert: AlertItem) => void,
  onResolved: (payload: { tripToken: string }) => void,
): Socket {
  if (socket) {
    socket.disconnect();
  }

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

  socket = io(`${wsUrl}/panel`, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to /panel namespace');
  });

  socket.on('trip:ping', (data: AnonymizedTrip) => {
    onPing(data);
  });

  socket.on('alert:new', (data: AlertItem) => {
    onAlert(data);
  });

  socket.on('alert:resolved', (data: { tripToken: string }) => {
    onResolved(data);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  return socket;
}

export function disconnectPanelSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
