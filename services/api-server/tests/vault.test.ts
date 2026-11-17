import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VaultService } from '../src/modules/vault/vault.service.js';
import type { StudentProfile } from '../src/modules/vault/vault.schemas.js';

describe('VaultService — AES-256-GCM Identity Vault', () => {
  const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  let mockDb: any;
  let vaultService: VaultService;

  beforeEach(() => {
    process.env.VAULT_ENCRYPTION_KEY = TEST_KEY;
    mockDb = {
      connect: vi.fn(),
      query: vi.fn(),
    };
    vaultService = new VaultService(mockDb);
  });

  const sampleProfile: StudentProfile = {
    fullName: 'Jane Doe',
    photoUrl: 'https://university.edu/photos/jdoe.jpg',
    dormBuilding: 'West Hall',
    roomNumber: '304B',
    emergencyContacts: [
      {
        name: 'Sarah Doe',
        phone: '+1-555-0199',
        relationship: 'Mother',
      },
    ],
    medicalNotes: 'Asthma inhaler in backpack',
  };

  it('encrypts and decrypts a student profile with round-trip fidelity', async () => {
    const encrypted = await vaultService.encryptProfile(sampleProfile);
    expect(Buffer.isBuffer(encrypted)).toBe(true);
    // IV (12) + AuthTag (16) + Ciphertext (> 0)
    expect(encrypted.length).toBeGreaterThan(28);

    const decrypted = await vaultService.decryptProfile(encrypted);
    expect(decrypted).toEqual(sampleProfile);
  });

  it('fails decryption when ciphertext is tampered (AES-256-GCM auth tag verification failure)', async () => {
    const encrypted = await vaultService.encryptProfile(sampleProfile);
    // Tamper with the ciphertext payload (after IV 12 and AuthTag 16)
    const tampered = Buffer.from(encrypted);
    tampered[tampered.length - 1] ^= 0xff;

    await expect(vaultService.decryptProfile(tampered)).rejects.toThrow();
  });

  it('fails decryption when auth tag is tampered', async () => {
    const encrypted = await vaultService.encryptProfile(sampleProfile);
    const tampered = Buffer.from(encrypted);
    // Tamper with byte in the auth tag region (bytes 12-27)
    tampered[15] ^= 0x01;

    await expect(vaultService.decryptProfile(tampered)).rejects.toThrow();
  });

  it('encrypts and decrypts student_ref UUIDs with round-trip fidelity', async () => {
    const sampleUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const encryptedRef = await vaultService.encryptStudentRef(sampleUuid);

    expect(Buffer.isBuffer(encryptedRef)).toBe(true);
    expect(encryptedRef.length).toBeGreaterThan(28);

    const decryptedUuid = await vaultService.decryptStudentRef(encryptedRef);
    expect(decryptedUuid).toBe(sampleUuid);
  });

  it('records an immutable entry in unlock_audit_logs when unlocking identity', async () => {
    const tripToken = 'c4b8b6e2-7634-4a41-b016-1f9fbe3c1622';
    const studentId = 'd89c2580-2a8d-4e92-9447-38e920556f88';

    const encRef = await vaultService.encryptStudentRef(studentId);
    const encProfile = await vaultService.encryptProfile(sampleProfile);

    const mockClient = {
      query: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('SELECT encrypted_student_ref FROM active_trips')) {
          return Promise.resolve({ rows: [{ encrypted_student_ref: encRef }] });
        }
        if (sql.includes('SELECT encrypted_profile, university_email FROM students_vault')) {
          return Promise.resolve({
            rows: [
              {
                encrypted_profile: encProfile,
                university_email: 'jdoe@university.edu',
              },
            ],
          });
        }
        if (sql.includes('INSERT INTO unlock_audit_logs')) {
          return Promise.resolve({ rowCount: 1 });
        }
        if (sql.includes('UPDATE alerts')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      }),
      release: vi.fn(),
    };

    mockDb.connect.mockResolvedValue(mockClient);

    const unlocked = await vaultService.unlockIdentity(tripToken, 'SOS', 'SYSTEM');

    expect(unlocked.fullName).toBe('Jane Doe');
    expect(unlocked.studentId).toBe(studentId);
    expect(unlocked.universityEmail).toBe('jdoe@university.edu');

    // Verify audit log query was called
    const auditInsert = mockClient.query.mock.calls.find((call) =>
      call[0]?.includes('INSERT INTO unlock_audit_logs'),
    );
    expect(auditInsert).toBeDefined();
    expect(auditInsert[1][0]).toBe(tripToken);
    expect(auditInsert[1][1]).toBe(studentId);
    expect(auditInsert[1][2]).toBe('SOS');
    expect(auditInsert[1][3]).toBe('SYSTEM');
  });
});
