const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../services/api-server/src/modules/students/students.service.ts');

const dorms = [
  { name: 'Dundee Hall', rooms: ['102', '215', '304', '412', '518', '620'] },
  { name: 'Aberdeen-Inverness (A&I)', rooms: ['A-101', 'A-204', 'B-112', 'B-205', 'C-310'] },
  { name: 'Lothian Residence Hall', rooms: ['112', '218', '310', '405', '512'] },
  { name: 'Glen Mor Student Apartments', rooms: ['Bldg A-102', 'Bldg D-204', 'Bldg G-310', 'Bldg K-118'] },
  { name: 'Pentland Hills', rooms: ['Oak-102', 'Oak-204', 'Pine-210', 'Pine-315', 'Cedar-104'] },
  { name: 'North District Apartments', rooms: ['1102', '2204', '3310', '4105', '5218'] },
  { name: 'Bannockburn Village', rooms: ['A-14', 'B-22', 'C-31', 'D-08'] },
  { name: 'Stonehaven Apartments', rooms: ['104', '208', '312', '416'] },
  { name: 'Falkirk Apartments', rooms: ['F-12', 'F-24', 'F-36'] },
  { name: 'Plaza Apartments', rooms: ['P-101', 'P-202', 'P-303'] }
];

const rawStudents = [
  ['Maya', 'Lin', 'mlin@ucr.edu', 'David Lin (Father)', '(951) 555-0144', 'Asthma inhaler in backpack', 48, 'ACTIVE_TRIP', true, 30],
  ['Alex', 'Chen', 'achen@ucr.edu', 'Grace Chen (Mother)', '(951) 555-0199', 'None', 24, 'SAFE', true, 45],
  ['Jordan', 'Taylor', 'jtaylor@ucr.edu', 'Marcus Taylor (Brother)', '(951) 555-0182', 'Severe Peanut Allergy (Carries EpiPen)', 48, 'OVERDUE', true, 60],
  ['Liam', 'O’Connor', 'loconnor@ucr.edu', 'Fiona O’Connor (Mother)', '(951) 555-0131', 'Type 1 Diabetes (CGM Sensor)', 48, 'SAFE', true, 15],
  ['Sophia', 'Rodriguez', 'srodriguez@ucr.edu', 'Elena Rodriguez (Sister)', '(951) 555-0177', 'None', 72, 'SAFE', false, 2],
  ['Marcus', 'Washington', 'mwashington@ucr.edu', 'Brenda Washington (Mother)', '(951) 555-0211', 'None', 48, 'SAFE', true, 120],
  ['Emily', 'Zhang', 'ezhang@ucr.edu', 'Kevin Zhang (Father)', '(951) 555-0212', 'Penicillin Allergy', 48, 'ACTIVE_TRIP', true, 90],
  ['Carlos', 'Mendoza', 'cmendoza@ucr.edu', 'Rosa Mendoza (Mother)', '(951) 555-0213', 'None', 24, 'SAFE', true, 150],
  ['Priya', 'Patel', 'ppatel@ucr.edu', 'Raj Patel (Father)', '(951) 555-0214', 'Carries Inhaler for Exercise-Induced Asthma', 48, 'SAFE', true, 80],
  ['Ethan', 'Kim', 'ekim@ucr.edu', 'Sun-Hee Kim (Mother)', '(951) 555-0215', 'None', 48, 'SAFE', true, 40],
  ['Chloe', 'Nguyen', 'cnguyen@ucr.edu', 'Tuan Nguyen (Father)', '(951) 555-0216', 'Allergic to Tree Nuts', 24, 'SAFE', true, 200],
  ['Aiden', 'Brooks', 'abrooks@ucr.edu', 'Sarah Brooks (Mother)', '(951) 555-0217', 'None', 48, 'ACTIVE_TRIP', true, 35],
  ['Isabella', 'Hernandez', 'ihernandez@ucr.edu', 'Mateo Hernandez (Brother)', '(951) 555-0218', 'Hypoglycemia', 48, 'SAFE', true, 110],
  ['Noah', 'Goldman', 'ngoldman@ucr.edu', 'Rachel Goldman (Mother)', '(951) 555-0219', 'None', 72, 'SAFE', true, 75],
  ['Fatima', 'Al-Mansoor', 'falmansoor@ucr.edu', 'Tariq Al-Mansoor (Father)', '(951) 555-0220', 'Mild Latex Allergy', 48, 'SAFE', true, 180],
  ['Lucas', 'Silva', 'lsilva@ucr.edu', 'Beatriz Silva (Mother)', '(951) 555-0221', 'None', 48, 'OVERDUE', true, 25],
  ['Ava', 'Kowalski', 'akowalski@ucr.edu', 'Jan Kowalski (Father)', '(951) 555-0222', 'Migraine with Aura', 24, 'SAFE', true, 50],
  ['Daniel', 'Park', 'dpark@ucr.edu', 'Min-Ji Park (Sister)', '(951) 555-0223', 'None', 48, 'SAFE', true, 95],
  ['Mia', 'Johnson', 'mjohnson@ucr.edu', 'Arthur Johnson (Father)', '(951) 555-0224', 'Carries Glucagon Kit', 48, 'ACTIVE_TRIP', true, 140],
  ['Sebastian', 'Cruz', 'scruz@ucr.edu', 'Carmen Cruz (Mother)', '(951) 555-0225', 'None', 72, 'SAFE', true, 65],
  ['Ananya', 'Sharma', 'asharma@ucr.edu', 'Vikram Sharma (Father)', '(951) 555-0226', 'Sulfa Antibiotic Allergy', 48, 'SAFE', true, 220],
  ['Benjamin', 'Foster', 'bfoster@ucr.edu', 'Diane Foster (Mother)', '(951) 555-0227', 'None', 48, 'SAFE', true, 10],
  ['Zoe', 'Martinez', 'zmartinez@ucr.edu', 'Jorge Martinez (Father)', '(951) 555-0228', 'Asthma (Albuterol)', 24, 'SAFE', true, 85],
  ['William', 'Nakamura', 'wnakamura@ucr.edu', 'Keiko Nakamura (Mother)', '(951) 555-0229', 'None', 48, 'SAFE', true, 130],
  ['Layla', 'Hassan', 'lhassan@ucr.edu', 'Omar Hassan (Brother)', '(951) 555-0230', 'Celiac Disease', 48, 'OVERDUE', true, 15],
  ['Jackson', 'Lee', 'jlee@ucr.edu', 'Grace Lee (Mother)', '(951) 555-0231', 'None', 48, 'ACTIVE_TRIP', true, 45],
  ['Harper', 'Davis', 'hdavis@ucr.edu', 'Robert Davis (Father)', '(951) 555-0232', 'Contact Lenses', 72, 'SAFE', true, 310],
  ['Oliver', 'Gomez', 'ogomez@ucr.edu', 'Lucia Gomez (Mother)', '(951) 555-0233', 'None', 48, 'SAFE', true, 160],
  ['Grace', 'Wang', 'gwang@ucr.edu', 'Hao Wang (Father)', '(951) 555-0234', 'Bee Sting Allergy (EpiPen)', 24, 'SAFE', true, 250],
  ['Henry', 'Wilson', 'hwilson@ucr.edu', 'Laura Wilson (Mother)', '(951) 555-0235', 'None', 48, 'SAFE', true, 105],
  ['Hannah', 'Ali', 'hali@ucr.edu', 'Zubair Ali (Father)', '(951) 555-0236', 'None', 48, 'SAFE', true, 70],
  ['Samuel', 'Torres', 'storres@ucr.edu', 'Maria Torres (Mother)', '(951) 555-0237', 'Epilepsy (Treated, Alert Tag)', 24, 'SAFE', true, 175],
  ['Ella', 'Dubois', 'edubois@ucr.edu', 'Pierre Dubois (Father)', '(951) 555-0238', 'None', 48, 'ACTIVE_TRIP', true, 280],
  ['David', 'Okafor', 'dokafor@ucr.edu', 'Ngozi Okafor (Mother)', '(951) 555-0239', 'Sickle Cell Trait', 48, 'SAFE', true, 90],
  ['Victoria', 'Santos', 'vsantos@ucr.edu', 'Paulo Santos (Father)', '(951) 555-0240', 'None', 72, 'SAFE', true, 195],
  ['Gabriel', 'Reyes', 'greyes@ucr.edu', 'Sofia Reyes (Sister)', '(951) 555-0241', 'Shellfish Allergy', 48, 'SAFE', true, 40],
  ['Aria', 'Siddiqui', 'asiddiqui@ucr.edu', 'Farhan Siddiqui (Father)', '(951) 555-0242', 'None', 48, 'OVERDUE', true, 330],
  ['Carter', 'Evans', 'cevans@ucr.edu', 'Nancy Evans (Mother)', '(951) 555-0243', 'None', 24, 'SAFE', true, 115],
  ['Penelope', 'Morales', 'pmorales@ucr.edu', 'Victor Morales (Father)', '(951) 555-0244', 'Asthma', 48, 'SAFE', true, 145],
  ['Julian', 'Popov', 'jpopov@ucr.edu', 'Irina Popov (Mother)', '(951) 555-0245', 'None', 48, 'ACTIVE_TRIP', true, 210],
  ['Nora', 'Campbell', 'ncampbell@ucr.edu', 'Thomas Campbell (Father)', '(951) 555-0246', 'None', 72, 'SAFE', true, 60],
  ['Leo', 'Yamamoto', 'lyamamoto@ucr.edu', 'Yoko Yamamoto (Mother)', '(951) 555-0247', 'Carries EpiPen', 48, 'SAFE', true, 340],
  ['Stella', 'Flores', 'sflores@ucr.edu', 'Andres Flores (Father)', '(951) 555-0248', 'None', 24, 'SAFE', true, 80],
  ['Caleb', 'Wright', 'cwright@ucr.edu', 'Karen Wright (Mother)', '(951) 555-0249', 'Type 1 Diabetes', 48, 'SAFE', true, 125],
  ['Audrey', 'Gupta', 'agupta@ucr.edu', 'Deepak Gupta (Father)', '(951) 555-0250', 'None', 48, 'OVERDUE', true, 270],
  ['Eli', 'Gutierrez', 'egutierrez@ucr.edu', 'Esther Gutierrez (Mother)', '(951) 555-0251', 'None', 48, 'SAFE', true, 95],
  ['Samantha', 'Ross', 'sross@ucr.edu', 'Brian Ross (Father)', '(951) 555-0252', 'None', 72, 'SAFE', true, 160],
  ['Anthony', 'Castillo', 'acastillo@ucr.edu', 'Juana Castillo (Mother)', '(951) 555-0253', 'Penicillin Allergy', 48, 'ACTIVE_TRIP', true, 305],
  ['Claire', 'O’Brien', 'cobrien@ucr.edu', 'Patrick O’Brien (Father)', '(951) 555-0254', 'None', 24, 'SAFE', true, 55],
  ['Jonathan', 'Mei', 'jmei@ucr.edu', 'Li-Wei Mei (Mother)', '(951) 555-0255', 'Asthma', 48, 'SAFE', true, 230],
  ['Elena', 'Rostova', 'erostova@ucr.edu', 'Viktor Rostova (Father)', '(951) 555-0256', 'None', 48, 'SAFE', true, 140],
  ['Dante', 'Moretti', 'dmoretti@ucr.edu', 'Marco Moretti (Father)', '(951) 555-0257', 'None', 72, 'SAFE', true, 350]
];

const generated = rawStudents.map((s, idx) => {
  const dIdx = idx % dorms.length;
  const dorm = dorms[dIdx];
  const room = dorm.rooms[idx % dorm.rooms.length];
  const studentNum = (idx + 1).toString().padStart(3, '0');
  const isOverdue = s[7] === 'OVERDUE';
  const dueOffsetHours = isOverdue ? -3 : 24 + (idx % 24);

  return `  {
    studentId: 'student-uuid-ucr-${studentNum}',
    universityEmail: '${s[2]}',
    fullName: '${s[0]} ${s[1]}',
    dormBuilding: '${dorm.name}',
    roomNumber: '${room}',
    emergencyContactName: '${s[3]}',
    emergencyContactPhone: '${s[4]}',
    medicalNotes: '${s[5]}',
    checkinIntervalHours: ${s[6]},
    nextCheckinDue: new Date(Date.now() + ${dueOffsetHours} * 60 * 60 * 1000).toISOString(),
    status: '${s[7]}',
    factorsConfigured: ${s[8]},
    createdAt: new Date(Date.now() - ${s[9]} * 24 * 60 * 60 * 1000).toISOString(),
  }`;
});

const storeCode = `// Initial seed mock students for offline/demo operation (52 UC Riverside Students)
const mockStudentsStore: StudentListItem[] = [
${generated.join(',\n')}
];`;

let content = fs.readFileSync(targetFile, 'utf8');
content = content.replace(/\/\/ Initial seed mock students[\s\S]*?\n\];/, storeCode);
fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully wrote 52 students into students.service.ts!');
