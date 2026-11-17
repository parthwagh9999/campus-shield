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

// Initial seed mock students for offline/demo operation (52 UC Riverside Students)
const mockStudentsStore: StudentListItem[] = [
  {
    studentId: 'student-uuid-ucr-001',
    universityEmail: 'mlin@ucr.edu',
    fullName: 'Maya Lin',
    dormBuilding: 'Dundee Hall',
    roomNumber: '102',
    emergencyContactName: 'David Lin (Father)',
    emergencyContactPhone: '(951) 555-0144',
    medicalNotes: 'Asthma inhaler in backpack',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE_TRIP',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-002',
    universityEmail: 'achen@ucr.edu',
    fullName: 'Alex Chen',
    dormBuilding: 'Aberdeen-Inverness (A&I)',
    roomNumber: 'A-204',
    emergencyContactName: 'Grace Chen (Mother)',
    emergencyContactPhone: '(951) 555-0199',
    medicalNotes: 'None',
    checkinIntervalHours: 24,
    nextCheckinDue: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-003',
    universityEmail: 'jtaylor@ucr.edu',
    fullName: 'Jordan Taylor',
    dormBuilding: 'Lothian Residence Hall',
    roomNumber: '310',
    emergencyContactName: 'Marcus Taylor (Brother)',
    emergencyContactPhone: '(951) 555-0182',
    medicalNotes: 'Severe Peanut Allergy (Carries EpiPen)',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + -3 * 60 * 60 * 1000).toISOString(),
    status: 'OVERDUE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-004',
    universityEmail: 'loconnor@ucr.edu',
    fullName: 'Liam O’Connor',
    dormBuilding: 'Glen Mor Student Apartments',
    roomNumber: 'Bldg K-118',
    emergencyContactName: 'Fiona O’Connor (Mother)',
    emergencyContactPhone: '(951) 555-0131',
    medicalNotes: 'Type 1 Diabetes (CGM Sensor)',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 27 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-005',
    universityEmail: 'srodriguez@ucr.edu',
    fullName: 'Sophia Rodriguez',
    dormBuilding: 'Pentland Hills',
    roomNumber: 'Cedar-104',
    emergencyContactName: 'Elena Rodriguez (Sister)',
    emergencyContactPhone: '(951) 555-0177',
    medicalNotes: 'None',
    checkinIntervalHours: 72,
    nextCheckinDue: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: false,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-006',
    universityEmail: 'mwashington@ucr.edu',
    fullName: 'Marcus Washington',
    dormBuilding: 'North District Apartments',
    roomNumber: '1102',
    emergencyContactName: 'Brenda Washington (Mother)',
    emergencyContactPhone: '(951) 555-0211',
    medicalNotes: 'None',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 29 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-007',
    universityEmail: 'ezhang@ucr.edu',
    fullName: 'Emily Zhang',
    dormBuilding: 'Bannockburn Village',
    roomNumber: 'C-31',
    emergencyContactName: 'Kevin Zhang (Father)',
    emergencyContactPhone: '(951) 555-0212',
    medicalNotes: 'Penicillin Allergy',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE_TRIP',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-008',
    universityEmail: 'cmendoza@ucr.edu',
    fullName: 'Carlos Mendoza',
    dormBuilding: 'Stonehaven Apartments',
    roomNumber: '416',
    emergencyContactName: 'Rosa Mendoza (Mother)',
    emergencyContactPhone: '(951) 555-0213',
    medicalNotes: 'None',
    checkinIntervalHours: 24,
    nextCheckinDue: new Date(Date.now() + 31 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-009',
    universityEmail: 'ppatel@ucr.edu',
    fullName: 'Priya Patel',
    dormBuilding: 'Falkirk Apartments',
    roomNumber: 'F-36',
    emergencyContactName: 'Raj Patel (Father)',
    emergencyContactPhone: '(951) 555-0214',
    medicalNotes: 'Carries Inhaler for Exercise-Induced Asthma',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 32 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-010',
    universityEmail: 'ekim@ucr.edu',
    fullName: 'Ethan Kim',
    dormBuilding: 'Plaza Apartments',
    roomNumber: 'P-101',
    emergencyContactName: 'Sun-Hee Kim (Mother)',
    emergencyContactPhone: '(951) 555-0215',
    medicalNotes: 'None',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 33 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-011',
    universityEmail: 'cnguyen@ucr.edu',
    fullName: 'Chloe Nguyen',
    dormBuilding: 'Dundee Hall',
    roomNumber: '518',
    emergencyContactName: 'Tuan Nguyen (Father)',
    emergencyContactPhone: '(951) 555-0216',
    medicalNotes: 'Allergic to Tree Nuts',
    checkinIntervalHours: 24,
    nextCheckinDue: new Date(Date.now() + 34 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-012',
    universityEmail: 'abrooks@ucr.edu',
    fullName: 'Aiden Brooks',
    dormBuilding: 'Aberdeen-Inverness (A&I)',
    roomNumber: 'A-204',
    emergencyContactName: 'Sarah Brooks (Mother)',
    emergencyContactPhone: '(951) 555-0217',
    medicalNotes: 'None',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 35 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE_TRIP',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-013',
    universityEmail: 'ihernandez@ucr.edu',
    fullName: 'Isabella Hernandez',
    dormBuilding: 'Lothian Residence Hall',
    roomNumber: '310',
    emergencyContactName: 'Mateo Hernandez (Brother)',
    emergencyContactPhone: '(951) 555-0218',
    medicalNotes: 'Hypoglycemia',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 110 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-014',
    universityEmail: 'ngoldman@ucr.edu',
    fullName: 'Noah Goldman',
    dormBuilding: 'Glen Mor Student Apartments',
    roomNumber: 'Bldg D-204',
    emergencyContactName: 'Rachel Goldman (Mother)',
    emergencyContactPhone: '(951) 555-0219',
    medicalNotes: 'None',
    checkinIntervalHours: 72,
    nextCheckinDue: new Date(Date.now() + 37 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-015',
    universityEmail: 'falmansoor@ucr.edu',
    fullName: 'Fatima Al-Mansoor',
    dormBuilding: 'Pentland Hills',
    roomNumber: 'Cedar-104',
    emergencyContactName: 'Tariq Al-Mansoor (Father)',
    emergencyContactPhone: '(951) 555-0220',
    medicalNotes: 'Mild Latex Allergy',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 38 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-016',
    universityEmail: 'lsilva@ucr.edu',
    fullName: 'Lucas Silva',
    dormBuilding: 'North District Apartments',
    roomNumber: '1102',
    emergencyContactName: 'Beatriz Silva (Mother)',
    emergencyContactPhone: '(951) 555-0221',
    medicalNotes: 'None',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + -3 * 60 * 60 * 1000).toISOString(),
    status: 'OVERDUE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-017',
    universityEmail: 'akowalski@ucr.edu',
    fullName: 'Ava Kowalski',
    dormBuilding: 'Bannockburn Village',
    roomNumber: 'A-14',
    emergencyContactName: 'Jan Kowalski (Father)',
    emergencyContactPhone: '(951) 555-0222',
    medicalNotes: 'Migraine with Aura',
    checkinIntervalHours: 24,
    nextCheckinDue: new Date(Date.now() + 40 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-018',
    universityEmail: 'dpark@ucr.edu',
    fullName: 'Daniel Park',
    dormBuilding: 'Stonehaven Apartments',
    roomNumber: '208',
    emergencyContactName: 'Min-Ji Park (Sister)',
    emergencyContactPhone: '(951) 555-0223',
    medicalNotes: 'None',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 41 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-019',
    universityEmail: 'mjohnson@ucr.edu',
    fullName: 'Mia Johnson',
    dormBuilding: 'Falkirk Apartments',
    roomNumber: 'F-12',
    emergencyContactName: 'Arthur Johnson (Father)',
    emergencyContactPhone: '(951) 555-0224',
    medicalNotes: 'Carries Glucagon Kit',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 42 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE_TRIP',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 140 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-020',
    universityEmail: 'scruz@ucr.edu',
    fullName: 'Sebastian Cruz',
    dormBuilding: 'Plaza Apartments',
    roomNumber: 'P-202',
    emergencyContactName: 'Carmen Cruz (Mother)',
    emergencyContactPhone: '(951) 555-0225',
    medicalNotes: 'None',
    checkinIntervalHours: 72,
    nextCheckinDue: new Date(Date.now() + 43 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-021',
    universityEmail: 'asharma@ucr.edu',
    fullName: 'Ananya Sharma',
    dormBuilding: 'Dundee Hall',
    roomNumber: '304',
    emergencyContactName: 'Vikram Sharma (Father)',
    emergencyContactPhone: '(951) 555-0226',
    medicalNotes: 'Sulfa Antibiotic Allergy',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 44 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 220 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-022',
    universityEmail: 'bfoster@ucr.edu',
    fullName: 'Benjamin Foster',
    dormBuilding: 'Aberdeen-Inverness (A&I)',
    roomNumber: 'A-204',
    emergencyContactName: 'Diane Foster (Mother)',
    emergencyContactPhone: '(951) 555-0227',
    medicalNotes: 'None',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 45 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-023',
    universityEmail: 'zmartinez@ucr.edu',
    fullName: 'Zoe Martinez',
    dormBuilding: 'Lothian Residence Hall',
    roomNumber: '310',
    emergencyContactName: 'Jorge Martinez (Father)',
    emergencyContactPhone: '(951) 555-0228',
    medicalNotes: 'Asthma (Albuterol)',
    checkinIntervalHours: 24,
    nextCheckinDue: new Date(Date.now() + 46 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-024',
    universityEmail: 'wnakamura@ucr.edu',
    fullName: 'William Nakamura',
    dormBuilding: 'Glen Mor Student Apartments',
    roomNumber: 'Bldg K-118',
    emergencyContactName: 'Keiko Nakamura (Mother)',
    emergencyContactPhone: '(951) 555-0229',
    medicalNotes: 'None',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 130 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-025',
    universityEmail: 'lhassan@ucr.edu',
    fullName: 'Layla Hassan',
    dormBuilding: 'Pentland Hills',
    roomNumber: 'Cedar-104',
    emergencyContactName: 'Omar Hassan (Brother)',
    emergencyContactPhone: '(951) 555-0230',
    medicalNotes: 'Celiac Disease',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + -3 * 60 * 60 * 1000).toISOString(),
    status: 'OVERDUE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-026',
    universityEmail: 'jlee@ucr.edu',
    fullName: 'Jackson Lee',
    dormBuilding: 'North District Apartments',
    roomNumber: '1102',
    emergencyContactName: 'Grace Lee (Mother)',
    emergencyContactPhone: '(951) 555-0231',
    medicalNotes: 'None',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE_TRIP',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-027',
    universityEmail: 'hdavis@ucr.edu',
    fullName: 'Harper Davis',
    dormBuilding: 'Bannockburn Village',
    roomNumber: 'C-31',
    emergencyContactName: 'Robert Davis (Father)',
    emergencyContactPhone: '(951) 555-0232',
    medicalNotes: 'Contact Lenses',
    checkinIntervalHours: 72,
    nextCheckinDue: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 310 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-028',
    universityEmail: 'ogomez@ucr.edu',
    fullName: 'Oliver Gomez',
    dormBuilding: 'Stonehaven Apartments',
    roomNumber: '416',
    emergencyContactName: 'Lucia Gomez (Mother)',
    emergencyContactPhone: '(951) 555-0233',
    medicalNotes: 'None',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 27 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 160 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-029',
    universityEmail: 'gwang@ucr.edu',
    fullName: 'Grace Wang',
    dormBuilding: 'Falkirk Apartments',
    roomNumber: 'F-24',
    emergencyContactName: 'Hao Wang (Father)',
    emergencyContactPhone: '(951) 555-0234',
    medicalNotes: 'Bee Sting Allergy (EpiPen)',
    checkinIntervalHours: 24,
    nextCheckinDue: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 250 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-030',
    universityEmail: 'hwilson@ucr.edu',
    fullName: 'Henry Wilson',
    dormBuilding: 'Plaza Apartments',
    roomNumber: 'P-303',
    emergencyContactName: 'Laura Wilson (Mother)',
    emergencyContactPhone: '(951) 555-0235',
    medicalNotes: 'None',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 29 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 105 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-031',
    universityEmail: 'hali@ucr.edu',
    fullName: 'Hannah Ali',
    dormBuilding: 'Dundee Hall',
    roomNumber: '102',
    emergencyContactName: 'Zubair Ali (Father)',
    emergencyContactPhone: '(951) 555-0236',
    medicalNotes: 'None',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-032',
    universityEmail: 'storres@ucr.edu',
    fullName: 'Samuel Torres',
    dormBuilding: 'Aberdeen-Inverness (A&I)',
    roomNumber: 'A-204',
    emergencyContactName: 'Maria Torres (Mother)',
    emergencyContactPhone: '(951) 555-0237',
    medicalNotes: 'Epilepsy (Treated, Alert Tag)',
    checkinIntervalHours: 24,
    nextCheckinDue: new Date(Date.now() + 31 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 175 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-033',
    universityEmail: 'edubois@ucr.edu',
    fullName: 'Ella Dubois',
    dormBuilding: 'Lothian Residence Hall',
    roomNumber: '310',
    emergencyContactName: 'Pierre Dubois (Father)',
    emergencyContactPhone: '(951) 555-0238',
    medicalNotes: 'None',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 32 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE_TRIP',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 280 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-034',
    universityEmail: 'dokafor@ucr.edu',
    fullName: 'David Okafor',
    dormBuilding: 'Glen Mor Student Apartments',
    roomNumber: 'Bldg D-204',
    emergencyContactName: 'Ngozi Okafor (Mother)',
    emergencyContactPhone: '(951) 555-0239',
    medicalNotes: 'Sickle Cell Trait',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 33 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-035',
    universityEmail: 'vsantos@ucr.edu',
    fullName: 'Victoria Santos',
    dormBuilding: 'Pentland Hills',
    roomNumber: 'Cedar-104',
    emergencyContactName: 'Paulo Santos (Father)',
    emergencyContactPhone: '(951) 555-0240',
    medicalNotes: 'None',
    checkinIntervalHours: 72,
    nextCheckinDue: new Date(Date.now() + 34 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 195 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-036',
    universityEmail: 'greyes@ucr.edu',
    fullName: 'Gabriel Reyes',
    dormBuilding: 'North District Apartments',
    roomNumber: '1102',
    emergencyContactName: 'Sofia Reyes (Sister)',
    emergencyContactPhone: '(951) 555-0241',
    medicalNotes: 'Shellfish Allergy',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 35 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-037',
    universityEmail: 'asiddiqui@ucr.edu',
    fullName: 'Aria Siddiqui',
    dormBuilding: 'Bannockburn Village',
    roomNumber: 'A-14',
    emergencyContactName: 'Farhan Siddiqui (Father)',
    emergencyContactPhone: '(951) 555-0242',
    medicalNotes: 'None',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + -3 * 60 * 60 * 1000).toISOString(),
    status: 'OVERDUE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 330 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-038',
    universityEmail: 'cevans@ucr.edu',
    fullName: 'Carter Evans',
    dormBuilding: 'Stonehaven Apartments',
    roomNumber: '208',
    emergencyContactName: 'Nancy Evans (Mother)',
    emergencyContactPhone: '(951) 555-0243',
    medicalNotes: 'None',
    checkinIntervalHours: 24,
    nextCheckinDue: new Date(Date.now() + 37 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 115 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-039',
    universityEmail: 'pmorales@ucr.edu',
    fullName: 'Penelope Morales',
    dormBuilding: 'Falkirk Apartments',
    roomNumber: 'F-36',
    emergencyContactName: 'Victor Morales (Father)',
    emergencyContactPhone: '(951) 555-0244',
    medicalNotes: 'Asthma',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 38 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 145 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-040',
    universityEmail: 'jpopov@ucr.edu',
    fullName: 'Julian Popov',
    dormBuilding: 'Plaza Apartments',
    roomNumber: 'P-101',
    emergencyContactName: 'Irina Popov (Mother)',
    emergencyContactPhone: '(951) 555-0245',
    medicalNotes: 'None',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 39 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE_TRIP',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 210 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-041',
    universityEmail: 'ncampbell@ucr.edu',
    fullName: 'Nora Campbell',
    dormBuilding: 'Dundee Hall',
    roomNumber: '518',
    emergencyContactName: 'Thomas Campbell (Father)',
    emergencyContactPhone: '(951) 555-0246',
    medicalNotes: 'None',
    checkinIntervalHours: 72,
    nextCheckinDue: new Date(Date.now() + 40 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-042',
    universityEmail: 'lyamamoto@ucr.edu',
    fullName: 'Leo Yamamoto',
    dormBuilding: 'Aberdeen-Inverness (A&I)',
    roomNumber: 'A-204',
    emergencyContactName: 'Yoko Yamamoto (Mother)',
    emergencyContactPhone: '(951) 555-0247',
    medicalNotes: 'Carries EpiPen',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 41 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 340 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-043',
    universityEmail: 'sflores@ucr.edu',
    fullName: 'Stella Flores',
    dormBuilding: 'Lothian Residence Hall',
    roomNumber: '310',
    emergencyContactName: 'Andres Flores (Father)',
    emergencyContactPhone: '(951) 555-0248',
    medicalNotes: 'None',
    checkinIntervalHours: 24,
    nextCheckinDue: new Date(Date.now() + 42 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-044',
    universityEmail: 'cwright@ucr.edu',
    fullName: 'Caleb Wright',
    dormBuilding: 'Glen Mor Student Apartments',
    roomNumber: 'Bldg K-118',
    emergencyContactName: 'Karen Wright (Mother)',
    emergencyContactPhone: '(951) 555-0249',
    medicalNotes: 'Type 1 Diabetes',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 43 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 125 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-045',
    universityEmail: 'agupta@ucr.edu',
    fullName: 'Audrey Gupta',
    dormBuilding: 'Pentland Hills',
    roomNumber: 'Cedar-104',
    emergencyContactName: 'Deepak Gupta (Father)',
    emergencyContactPhone: '(951) 555-0250',
    medicalNotes: 'None',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + -3 * 60 * 60 * 1000).toISOString(),
    status: 'OVERDUE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 270 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-046',
    universityEmail: 'egutierrez@ucr.edu',
    fullName: 'Eli Gutierrez',
    dormBuilding: 'North District Apartments',
    roomNumber: '1102',
    emergencyContactName: 'Esther Gutierrez (Mother)',
    emergencyContactPhone: '(951) 555-0251',
    medicalNotes: 'None',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 45 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-047',
    universityEmail: 'sross@ucr.edu',
    fullName: 'Samantha Ross',
    dormBuilding: 'Bannockburn Village',
    roomNumber: 'C-31',
    emergencyContactName: 'Brian Ross (Father)',
    emergencyContactPhone: '(951) 555-0252',
    medicalNotes: 'None',
    checkinIntervalHours: 72,
    nextCheckinDue: new Date(Date.now() + 46 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 160 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-048',
    universityEmail: 'acastillo@ucr.edu',
    fullName: 'Anthony Castillo',
    dormBuilding: 'Stonehaven Apartments',
    roomNumber: '416',
    emergencyContactName: 'Juana Castillo (Mother)',
    emergencyContactPhone: '(951) 555-0253',
    medicalNotes: 'Penicillin Allergy',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE_TRIP',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 305 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-049',
    universityEmail: 'cobrien@ucr.edu',
    fullName: 'Claire O’Brien',
    dormBuilding: 'Falkirk Apartments',
    roomNumber: 'F-12',
    emergencyContactName: 'Patrick O’Brien (Father)',
    emergencyContactPhone: '(951) 555-0254',
    medicalNotes: 'None',
    checkinIntervalHours: 24,
    nextCheckinDue: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-050',
    universityEmail: 'jmei@ucr.edu',
    fullName: 'Jonathan Mei',
    dormBuilding: 'Plaza Apartments',
    roomNumber: 'P-202',
    emergencyContactName: 'Li-Wei Mei (Mother)',
    emergencyContactPhone: '(951) 555-0255',
    medicalNotes: 'Asthma',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 230 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-051',
    universityEmail: 'erostova@ucr.edu',
    fullName: 'Elena Rostova',
    dormBuilding: 'Dundee Hall',
    roomNumber: '304',
    emergencyContactName: 'Viktor Rostova (Father)',
    emergencyContactPhone: '(951) 555-0256',
    medicalNotes: 'None',
    checkinIntervalHours: 48,
    nextCheckinDue: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 140 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    studentId: 'student-uuid-ucr-052',
    universityEmail: 'dmoretti@ucr.edu',
    fullName: 'Dante Moretti',
    dormBuilding: 'Aberdeen-Inverness (A&I)',
    roomNumber: 'A-204',
    emergencyContactName: 'Marco Moretti (Father)',
    emergencyContactPhone: '(951) 555-0257',
    medicalNotes: 'None',
    checkinIntervalHours: 72,
    nextCheckinDue: new Date(Date.now() + 27 * 60 * 60 * 1000).toISOString(),
    status: 'SAFE',
    factorsConfigured: true,
    createdAt: new Date(Date.now() - 350 * 24 * 60 * 60 * 1000).toISOString(),
  }
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
