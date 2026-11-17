import type { Pool } from 'pg';
import type { Server as SocketIOServer } from 'socket.io';
import { createLogger } from '../config/logger.js';

const log = createLogger('broadcaster');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FullAlert {
  alertId: string;
  tripToken: string;
  alertType: string;
  priority: number;
  status: string;
  decryptedProfile: Record<string, unknown> | null;
  lastKnownCoords: { lat: number; lng: number } | null;
  nearestPolice: Record<string, unknown>[] | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Broadcaster singleton
// ---------------------------------------------------------------------------

let io: SocketIOServer | null = null;

/**
 * Initialise the Socket.IO server and wire up the `/panel` namespace.
 *
 * Staff members connect to `ws://<host>/panel` and must present a valid staff
 * JWT as a Bearer token in the `auth.token` handshake payload.  On successful
 * auth they are auto-joined to the `panel` room.
 */
export function initBroadcaster(
  socketServer: SocketIOServer,
  _db: Pool,
  verifyStaffJwt: (token: string) => Promise<{ staffId: string; role: string }>,
): void {
  io = socketServer;

  const panelNs = io.of('/panel');

  panelNs.use(async (socket, next) => {
    try {
      const token =
        (socket.handshake.auth as { token?: string })?.token ??
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = await verifyStaffJwt(token);
      // Attach staff info so handlers can access it
      (socket.data as Record<string, unknown>).staffId = payload.staffId;
      (socket.data as Record<string, unknown>).role = payload.role;
      next();
    } catch (err) {
      log.warn('Socket auth failed', { error: (err as Error).message });
      next(new Error('Invalid or expired token'));
    }
  });

  panelNs.on('connection', (socket) => {
    log.info('Staff connected to panel', { staffId: socket.data.staffId });
    // Auto-join the panel room for broadcasts
    void socket.join('panel');

    socket.on('disconnect', () => {
      log.info('Staff disconnected from panel', { staffId: socket.data.staffId });
    });
  });

  log.info('WebSocket broadcaster initialised (/panel namespace)');
}

// ---------------------------------------------------------------------------
// Broadcast helpers — called from service / worker code
// ---------------------------------------------------------------------------

function getPanelNamespace() {
  if (!io) {
    throw new Error('Broadcaster not initialised – call initBroadcaster() first');
  }
  return io.of('/panel');
}

/**
 * Send an anonymised GPS ping to the panel room.
 */
export function broadcastPing(
  tripToken: string,
  lat: number,
  lng: number,
  status: string,
  batteryPct: number | null,
): void {
  try {
    getPanelNamespace().to('panel').emit('trip:ping', {
      tripToken,
      lat,
      lng,
      status,
      batteryPct,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    log.error('broadcastPing failed', { tripToken, error: (err as Error).message });
  }
}

/**
 * Send a fully-unlocked alert (identity revealed) to the panel room.
 */
export function broadcastAlert(alert: FullAlert): void {
  try {
    getPanelNamespace().to('panel').emit('alert:new', alert);
  } catch (err) {
    log.error('broadcastAlert failed', {
      alertId: alert.alertId,
      error: (err as Error).message,
    });
  }
}

/**
 * Notify the panel that an alert has been resolved.
 */
export function broadcastAlertResolved(tripToken: string): void {
  try {
    getPanelNamespace().to('panel').emit('alert:resolved', {
      tripToken,
      resolvedAt: new Date().toISOString(),
    });
  } catch (err) {
    log.error('broadcastAlertResolved failed', {
      tripToken,
      error: (err as Error).message,
    });
  }
}
