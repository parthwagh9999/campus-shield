import { describe, it, expect, beforeEach, vi } from 'vitest';
import argon2 from 'argon2';
import { CheckinService } from '../src/modules/checkin/checkin.service.js';
import { CheckinOutcome } from '../src/modules/checkin/checkin.schemas.js';

describe('CheckinService — 3-Password Ordered Anti-Coercion Check-In', () => {
  let mockDb: any;
  let mockVaultService: any;
  let checkinService: CheckinService;

  const studentId = 'd89c2580-2a8d-4e92-9447-38e920556f88';

  const rawPin = '5829';
  const rawPattern = '0-1-2-5-8';
  const rawPassphrase = 'midnight library safe';

  // Expected order: [2, 0, 1] => Passphrase (2) -> PIN (0) -> Pattern (1)
  const expectedOrder = [2, 0, 1];

  let hashPin: string;
  let hashPattern: string;
  let hashPassphrase: string;

  beforeEach(async () => {
    // Generate actual Argon2id hashes for realistic cryptographic testing
    hashPin = await argon2.hash(rawPin, { type: argon2.argon2id });
    hashPattern = await argon2.hash(rawPattern, { type: argon2.argon2id });
    hashPassphrase = await argon2.hash(rawPassphrase, { type: argon2.argon2id });

    mockDb = {
      query: vi.fn(),
      connect: vi.fn(),
    };

    mockVaultService = {
      encryptStudentRef: vi.fn().mockResolvedValue(Buffer.from('mock-enc-ref')),
      decryptStudentRef: vi.fn().mockResolvedValue(studentId),
      decryptProfile: vi.fn().mockResolvedValue({
        fullName: 'Jane Doe',
        emergencyContacts: [{ name: 'Mom', phone: '+1-555-0100', relationship: 'Parent' }],
      }),
    };

    checkinService = new CheckinService(mockDb, mockVaultService);
  });

  it('rejects with INVALID_TYPO when PIN is wrong (no alerts, no audit logs created)', async () => {
    mockDb.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT hash_pin, hash_pattern, hash_passphrase')) {
        return Promise.resolve({
          rows: [{ hash_pin: hashPin, hash_pattern: hashPattern, hash_passphrase: hashPassphrase, expected_order: expectedOrder }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    // Enter wrong PIN: '9999' instead of '5829'
    const result = await checkinService.verifyCheckin(studentId, [
      rawPassphrase,
      '9999', // WRONG PIN
      rawPattern,
    ]);

    expect(result.outcome).toBe(CheckinOutcome.INVALID_TYPO);
    // Ensure no client transaction was started (no emergency escalation)
    expect(mockDb.connect).not.toHaveBeenCalled();
  });

  it('rejects with INVALID_TYPO when pattern is wrong', async () => {
    mockDb.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT hash_pin, hash_pattern, hash_passphrase')) {
        return Promise.resolve({
          rows: [{ hash_pin: hashPin, hash_pattern: hashPattern, hash_passphrase: hashPassphrase, expected_order: expectedOrder }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await checkinService.verifyCheckin(studentId, [
      rawPassphrase,
      rawPin,
      '0-3-6-7', // WRONG PATTERN
    ]);

    expect(result.outcome).toBe(CheckinOutcome.INVALID_TYPO);
    expect(mockDb.connect).not.toHaveBeenCalled();
  });

  it('rejects with INVALID_TYPO when passphrase is wrong', async () => {
    mockDb.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT hash_pin, hash_pattern, hash_passphrase')) {
        return Promise.resolve({
          rows: [{ hash_pin: hashPin, hash_pattern: hashPattern, hash_passphrase: hashPassphrase, expected_order: expectedOrder }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await checkinService.verifyCheckin(studentId, [
      'wrong words here', // WRONG PASSPHRASE
      rawPin,
      rawPattern,
    ]);

    expect(result.outcome).toBe(CheckinOutcome.INVALID_TYPO);
    expect(mockDb.connect).not.toHaveBeenCalled();
  });

  it('approves with APPROVED_SAFE when all 3 factors match and entered in the EXACT secret order', async () => {
    mockDb.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT hash_pin, hash_pattern, hash_passphrase')) {
        return Promise.resolve({
          rows: [{ hash_pin: hashPin, hash_pattern: hashPattern, hash_passphrase: hashPassphrase, expected_order: expectedOrder }],
        });
      }
      if (sql.includes('SELECT checkin_interval_hours FROM students_vault')) {
        return Promise.resolve({ rows: [{ checkin_interval_hours: 48 }] });
      }
      if (sql.includes('UPDATE students_vault SET next_checkin_due')) {
        return Promise.resolve({ rowCount: 1 });
      }
      return Promise.resolve({ rows: [] });
    });

    // Expected order is [2, 0, 1] => Passphrase -> PIN -> Pattern
    const result = await checkinService.verifyCheckin(studentId, [
      rawPassphrase, // Factor 2
      rawPin,        // Factor 0
      rawPattern,    // Factor 1
    ]);

    expect(result.outcome).toBe(CheckinOutcome.APPROVED_SAFE);

    // Verify next check-in deadline was reset
    const updateDueCall = mockDb.query.mock.calls.find((call) =>
      call[0]?.includes('UPDATE students_vault SET next_checkin_due'),
    );
    expect(updateDueCall).toBeDefined();
    expect(updateDueCall[1][1]).toBe(studentId);
  });

  it('triggers SILENT_COERCION when all 3 factors are valid but entered in WRONG order', async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('SELECT trip_token FROM active_trips')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('SELECT encrypted_profile, university_email FROM students_vault')) {
          return Promise.resolve({
            rows: [
              {
                encrypted_profile: Buffer.from('mock-encrypted-profile'),
                university_email: 'jane@university.edu',
              },
            ],
          });
        }
        if (sql.includes('INSERT INTO alerts')) {
          return Promise.resolve({ rows: [{ alert_id: 'alert-coercion-1234' }] });
        }
        return Promise.resolve({ rows: [] });
      }),
      release: vi.fn(),
    };
    mockDb.connect.mockResolvedValue(mockClient);

    mockDb.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT hash_pin, hash_pattern, hash_passphrase')) {
        return Promise.resolve({
          rows: [{ hash_pin: hashPin, hash_pattern: hashPattern, hash_passphrase: hashPassphrase, expected_order: expectedOrder }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    // Expected order is [2, 0, 1] (Passphrase -> PIN -> Pattern)
    // Coercion scenario: attacker forces student to check in, student enters PIN first [0, 1, 2]!
    const result = await checkinService.verifyCheckin(studentId, [
      rawPin,        // Factor 0 (WRONG ORDER!)
      rawPattern,    // Factor 1
      rawPassphrase, // Factor 2
    ]);

    // Outcome is SILENT_COERCION
    expect(result.outcome).toBe(CheckinOutcome.SILENT_COERCION);
    expect(result.alertId).toBe('alert-coercion-1234');

    // Verify transaction ran and alert was created
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

    // Verify Priority-1 ALERT_COERCION inserted
    const alertCall = mockClient.query.mock.calls.find((call) =>
      call[0]?.includes('INSERT INTO alerts'),
    );
    expect(alertCall).toBeDefined();
    expect(alertCall[0]).toContain("'COERCION'");
    expect(alertCall[1][1]).toBe(studentId);
    expect(alertCall[1][2]).toBe(JSON.stringify({
      fullName: 'Jane Doe',
      emergencyContacts: [{ name: 'Mom', phone: '+1-555-0100', relationship: 'Parent' }],
      studentId: 'd89c2580-2a8d-4e92-9447-38e920556f88',
      universityEmail: 'jane@university.edu',
    }));

    // Verify immutable audit log was created
    const auditCall = mockClient.query.mock.calls.find((call) =>
      call[0]?.includes('INSERT INTO unlock_audit_logs'),
    );
    expect(auditCall).toBeDefined();
    expect(auditCall[0]).toContain("'COERCION'");
    expect(auditCall[0]).toContain("'SYSTEM'");
    expect(auditCall[1][1]).toBe(studentId);
  });

  it('rejects when student enters the same factor type twice', async () => {
    mockDb.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT hash_pin, hash_pattern, hash_passphrase')) {
        return Promise.resolve({
          rows: [{ hash_pin: hashPin, hash_pattern: hashPattern, hash_passphrase: hashPassphrase, expected_order: expectedOrder }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    // Enters PIN in both slot 1 and slot 2
    const result = await checkinService.verifyCheckin(studentId, [
      rawPin,
      rawPin,
      rawPassphrase,
    ]);

    expect(result.outcome).toBe(CheckinOutcome.INVALID_TYPO);
    expect(mockDb.connect).not.toHaveBeenCalled();
  });
});
