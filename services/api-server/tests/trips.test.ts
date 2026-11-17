import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TripsService } from '../src/modules/trips/trips.service.js';

describe('TripsService — Geofencing, Pings, SOS & Anonymized Live Tracking', () => {
  let mockDb: any;
  let mockVaultService: any;
  let tripsService: TripsService;

  const sampleTripToken = 'e3b0c442-98fc-1c14-9afbf4c8996fb924';

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
    };
    mockVaultService = {
      encryptStudentRef: vi.fn().mockResolvedValue(Buffer.from('encrypted-ref-buffer')),
      unlockIdentity: vi.fn().mockResolvedValue({
        fullName: 'Jane Doe',
        studentId: 'student-1234',
        universityEmail: 'jane@university.edu',
        dormBuilding: 'North Hall',
      }),
    };
    tripsService = new TripsService(mockDb, mockVaultService);
  });

  it('records ping and confirms inside perimeter when location is within polygon safe zone', async () => {
    mockDb.query.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO location_pings')) {
        return Promise.resolve({ rowCount: 1 });
      }
      if (sql.includes('SELECT') && sql.includes('ST_Contains')) {
        return Promise.resolve({
          rows: [{ status: 'ACTIVE', inside: true }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await tripsService.recordPing(sampleTripToken, 40.7128, -74.006, 85);

    expect(result.insidePerimeter).toBe(true);
    expect(result.tripStatus).toBe('ACTIVE');

    // Verify insert into location_pings was performed
    const insertCall = mockDb.query.mock.calls.find((c) =>
      c[0]?.includes('INSERT INTO location_pings'),
    );
    expect(insertCall).toBeDefined();
    expect(insertCall[1][0]).toBe(sampleTripToken);
    expect(insertCall[1][6]).toBe(85); // batteryPct
    expect(insertCall[1][7]).toBe(false); // isLowBattery
  });

  it('triggers 60s GRACE_PERIOD status when location exits safe perimeter', async () => {
    mockDb.query.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO location_pings')) {
        return Promise.resolve({ rowCount: 1 });
      }
      if (sql.includes('SELECT') && sql.includes('ST_Contains')) {
        return Promise.resolve({
          rows: [{ status: 'ACTIVE', inside: false }], // OUTSIDE PERIMETER!
        });
      }
      if (sql.includes('UPDATE active_trips') && sql.includes('GRACE_PERIOD')) {
        return Promise.resolve({ rowCount: 1 });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await tripsService.recordPing(sampleTripToken, 40.8000, -74.100, 75);

    expect(result.insidePerimeter).toBe(false);
    expect(result.tripStatus).toBe('GRACE_PERIOD');

    // Verify active_trips updated to GRACE_PERIOD
    const updateCall = mockDb.query.mock.calls.find((c) =>
      c[0]?.includes("SET status = 'GRACE_PERIOD'"),
    );
    expect(updateCall).toBeDefined();
    expect(updateCall[0]).toContain("alert_type = 'PERIMETER_BREACH'");
  });

  it('detects low battery (< 5%) failsafe and triggers emergency identity unlock', async () => {
    mockDb.query.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO location_pings')) {
        return Promise.resolve({ rowCount: 1 });
      }
      if (sql.includes('SELECT') && sql.includes('ST_Contains')) {
        return Promise.resolve({
          rows: [{ status: 'ACTIVE', inside: true }],
        });
      }
      if (sql.includes('UPDATE active_trips')) {
        return Promise.resolve({ rowCount: 1 });
      }
      return Promise.resolve({ rows: [] });
    });

    // Ping with 4% battery
    const result = await tripsService.recordPing(sampleTripToken, 40.7128, -74.006, 4);

    expect(result.tripStatus).toBe('ALERT_LOW_BATTERY');
    expect(mockVaultService.unlockIdentity).toHaveBeenCalledWith(
      sampleTripToken,
      'LOW_BATTERY',
      'SYSTEM',
    );
  });

  it('immediately unlocks identity and creates Priority-1 alert on SOS trigger', async () => {
    mockDb.query.mockImplementation((sql: string) => {
      if (sql.includes("SET status = 'ALERT_SOS'")) {
        return Promise.resolve({ rowCount: 1 });
      }
      if (sql.includes('SELECT ST_Y(coords) AS lat')) {
        return Promise.resolve({ rows: [{ lat: 40.7128, lng: -74.006 }] });
      }
      if (sql.includes('INSERT INTO alerts')) {
        return Promise.resolve({ rows: [{ alert_id: 'sos-alert-9999' }] });
      }
      if (sql.includes('UPDATE alerts SET nearest_police')) {
        return Promise.resolve({ rowCount: 1 });
      }
      return Promise.resolve({ rows: [] });
    });

    const alertId = await tripsService.triggerSOS(sampleTripToken);

    expect(alertId).toBe('sos-alert-9999');
    expect(mockVaultService.unlockIdentity).toHaveBeenCalledWith(
      sampleTripToken,
      'SOS',
      'SYSTEM',
    );
  });

  it('returns strictly anonymized trips with NO student identities in getActiveTripsAnonymized', async () => {
    mockDb.query.mockResolvedValue({
      rows: [
        {
          trip_token: 'trip-token-aaa',
          status: 'ACTIVE',
          updated_at: new Date('2026-11-17T12:00:00Z'),
          lat: 40.7128,
          lng: -74.006,
          battery_pct: 92,
        },
        {
          trip_token: 'trip-token-bbb',
          status: 'GRACE_PERIOD',
          updated_at: new Date('2026-11-17T12:05:00Z'),
          lat: 40.7135,
          lng: -74.008,
          battery_pct: 64,
        },
      ],
    });

    const anonymizedTrips = await tripsService.getActiveTripsAnonymized();

    expect(anonymizedTrips).toHaveLength(2);
    anonymizedTrips.forEach((t) => {
      expect(t).toHaveProperty('tripToken');
      expect(t).toHaveProperty('lat');
      expect(t).toHaveProperty('lng');
      expect(t).toHaveProperty('status');
      expect(t).toHaveProperty('batteryPct');
      // Strictly ensure NO student identity leaked
      expect(t).not.toHaveProperty('studentId');
      expect(t).not.toHaveProperty('name');
      expect(t).not.toHaveProperty('email');
    });
  });
});
