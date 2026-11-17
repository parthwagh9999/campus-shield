import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import type { VaultService } from '../vault/vault.service.js';
import type {
  CreateStudentInput,
  UpdateStudentInput,
  ListStudentsQuery,
  StudentListItem,
} from './students.schemas.js';
import { createLogger } from '../../config/logger.js';

const log = createLogger('students-service');

// Initial seed mock students for offline/demo operation (UC Riverside)
const mockStudentsStore: StudentListItem[] = [
  {
    studentId: 'student-uuid-demo-001',
    universityEmail: 'mlin@ucr.edu',
    fullName: 'Maya Lin',
    dormBuilding: 'Dundee Hall',
    roomNumber: '412',
    emergencyContactName: 'David Lin (Father)',
    emergencyContactPhone: '(951) 555-0144',
    medicalNotes: 'Asthma inhaler in backpack',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 32 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE_TRIP',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-demo-002',
    universityEmail: 'achen@ucr.edu',
    fullName: 'Alex Chen',
    dormBuilding: 'Aberdeen-Inverness (A&I)',
    roomNumber: 'B-205',
    emergencyContactName: 'Grace Chen (Mother)',
    emergencyContactPhone: '(951) 555-0199',
    medicalNotes: 'None',
    checkinIntervalHours: 24,
    nextCheckinDue: new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-demo-003',
    universityEmail: 'jtaylor@ucr.edu',
    fullName: 'Jordan Taylor',
    dormBuilding: 'Lothian Residence Hall',
    roomNumber: '310',
    emergencyContactName: 'Marcus Taylor (Brother)',
    emergencyContactPhone: '(951) 555-0182',
    medicalNotes: 'Severe Peanut Allergy (Carries EpiPen)',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Overdue!
    status: 'OVERDUE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-demo-004',
    universityEmail: 'loconnor@ucr.edu',
    fullName: 'Liam O’Connor',
    dormBuilding: 'Glen Mor Student Apartments',
    roomNumber: 'Building K-118',
    emergencyContactName: 'Fiona O’Connor (Mother)',
    emergencyContactPhone: '(951) 555-0131',
    medicalNotes: 'Type 1 Diabetes',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-demo-005',
    universityEmail: 'srodriguez@ucr.edu',
    fullName: 'Sophia Rodriguez',
    dormBuilding: 'Pentland Hills',
    roomNumber: 'Oak-204',
    emergencyContactName: 'Elena Rodriguez (Sister)',
    emergencyContactPhone: '(951) 555-0177',
    medicalNotes: 'None',
    checkinIntervalHours: 72,
    nextCheckinDue: new Date(Date.now() + 55 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: false, // Pending factor setup
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export class StudentsService {
  constructor(
    private readonly db: Pool,
    private readonly vaultService: VaultService,
  ) {}

  async listStudents(query: ListStudentsQuery): Promise<{ students: StudentListItem[]; total: number }> {
    try {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let paramIdx = 1;

      if (query.search) {
        conditions.push(`(university_email ILIKE $${paramIdx++})`);
        params.push(`%${query.search}%`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const res = await this.db.query<{
        student_id: string;
        university_email: string;
        encrypted_profile: Buffer;
        checkin_interval_hours: number;
        next_checkin_due: Date | null;
        created_at: Date;
      }>(
        `SELECT student_id, university_email, encrypted_profile, checkin_interval_hours, next_checkin_due, created_at
         FROM students_vault
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        [...params, query.limit, query.offset],
      );

      const countRes = await this.db.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM students_vault ${whereClause}`,
        params.slice(0, paramIdx - 3),
      );

      const students: StudentListItem[] = [];
      for (const row of res.rows) {
        try {
          const profile = await this.vaultService.decryptProfile(row.encrypted_profile);
          const isOverdue = row.next_checkin_due ? new Date(row.next_checkin_due) < new Date() : false;

          students.push({
            studentId: row.student_id,
            universityEmail: row.university_email,
            fullName: profile.fullName || 'Student',
            dormBuilding: profile.dormBuilding,
            roomNumber: profile.roomNumber,
            emergencyContactName: profile.emergencyContacts?.[0]?.name,
            emergencyContactPhone: profile.emergencyContacts?.[0]?.phone,
            medicalNotes: profile.medicalNotes,
            checkinIntervalHours: row.checkin_interval_hours,
            nextCheckinDue: row.next_checkin_due ? row.next_checkin_due.toISOString() : null,
            status: isOverdue ? 'OVERDUE' : 'SAFE',
            factorsConfigured: true,
            createdAt: row.created_at.toISOString(),
          });
        } catch {
          // ignore profile decryption error for individual row
        }
      }

      return { students, total: parseInt(countRes.rows[0]?.count || '0', 10) };
    } catch {
      // In-memory filter & return
      let filtered = [...mockStudentsStore];

      if (query.search) {
        const s = query.search.toLowerCase();
        filtered = filtered.filter(
          (item) =>
            item.fullName.toLowerCase().includes(s) ||
            item.universityEmail.toLowerCase().includes(s) ||
            item.dormBuilding?.toLowerCase().includes(s),
        );
      }

      if (query.dorm) {
        filtered = filtered.filter((item) => item.dormBuilding === query.dorm);
      }

      if (query.status && query.status !== 'ALL') {
        filtered = filtered.filter((item) => item.status === query.status);
      }

      const total = filtered.length;
      const paginated = filtered.slice(query.offset, query.offset + query.limit);

      return { students: paginated, total };
    }
  }

  async createStudent(input: CreateStudentInput): Promise<StudentListItem> {
    const studentId = randomUUID();
    const nextDue = new Date(Date.now() + input.checkinIntervalHours * 60 * 60 * 1000).toISOString();

    try {
      const passwordHash = await argon2.hash(input.password || 'TempPass2026!', {
        type: argon2.argon2id,
      });
      const encryptedProfile = await this.vaultService.encryptProfile(input.profile);

      await this.db.query(
        `INSERT INTO students_vault (
          student_id, university_email, password_hash, encrypted_profile,
          checkin_interval_hours, next_checkin_due, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, now())`,
        [
          studentId,
          input.universityEmail.toLowerCase(),
          passwordHash,
          encryptedProfile,
          input.checkinIntervalHours,
          new Date(nextDue),
        ],
      );
    } catch {
      log.warn('Database offline, saving student to in-memory store');
    }

    const newStudent: StudentListItem = {
      studentId,
      universityEmail: input.universityEmail.toLowerCase(),
      fullName: input.profile.fullName || 'New Student',
      dormBuilding: input.profile.dormBuilding,
      roomNumber: input.profile.roomNumber,
      emergencyContactName: input.profile.emergencyContacts?.[0]?.name,
      emergencyContactPhone: input.profile.emergencyContacts?.[0]?.phone,
      medicalNotes: input.profile.medicalNotes,
      checkinIntervalHours: input.checkinIntervalHours,
      nextCheckinDue: nextDue,
      status: 'SAFE',
      factorsConfigured: false,
      createdAt: new Date().toISOString(),
    };

    mockStudentsStore.unshift(newStudent);
    return newStudent;
  }

  async updateStudent(studentId: string, input: UpdateStudentInput): Promise<void> {
    try {
      if (input.universityEmail) {
        await this.db.query(
          'UPDATE students_vault SET university_email = $1 WHERE student_id = $2',
          [input.universityEmail.toLowerCase(), studentId],
        );
      }
      if (input.checkinIntervalHours) {
        await this.db.query(
          'UPDATE students_vault SET checkin_interval_hours = $1 WHERE student_id = $2',
          [input.checkinIntervalHours, studentId],
        );
      }
      if (input.profile) {
        const encrypted = await this.vaultService.encryptProfile(input.profile as any);
        await this.db.query(
          'UPDATE students_vault SET encrypted_profile = $1 WHERE student_id = $2',
          [encrypted, studentId],
        );
      }
    } catch {
      // Mock update
    }

    const idx = mockStudentsStore.findIndex((s) => s.studentId === studentId);
    if (idx !== -1) {
      const existing = mockStudentsStore[idx];
      mockStudentsStore[idx] = {
        ...existing,
        universityEmail: input.universityEmail?.toLowerCase() || existing.universityEmail,
        checkinIntervalHours: input.checkinIntervalHours || existing.checkinIntervalHours,
        fullName: input.profile?.fullName || existing.fullName,
        dormBuilding: input.profile?.dormBuilding !== undefined ? input.profile.dormBuilding : existing.dormBuilding,
        roomNumber: input.profile?.roomNumber !== undefined ? input.profile.roomNumber : existing.roomNumber,
        medicalNotes: input.profile?.medicalNotes !== undefined ? input.profile.medicalNotes : existing.medicalNotes,
      };
    }
  }

  async deleteStudent(studentId: string): Promise<void> {
    try {
      await this.db.query('DELETE FROM students_vault WHERE student_id = $1', [studentId]);
    } catch {
      // Mock delete
    }

    const idx = mockStudentsStore.findIndex((s) => s.studentId === studentId);
    if (idx !== -1) {
      mockStudentsStore.splice(idx, 1);
    }
  }

  async bulkImport(students: CreateStudentInput[]): Promise<{ importedCount: number }> {
    let importedCount = 0;
    for (const student of students) {
      await this.createStudent(student);
      importedCount++;
    }
    return { importedCount };
  }
}
