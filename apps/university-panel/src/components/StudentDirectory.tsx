'use client';

import React, { useState, useEffect } from 'react';
import type { StudentListItem } from '../types';
import {
  fetchStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkImportStudents,
} from '../lib/api';

export default function StudentDirectory() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form states for Add / Edit
  const [formEmail, setFormEmail] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formDorm, setFormDorm] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [formContactName, setFormContactName] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');
  const [formContactRelation, setFormContactRelation] = useState('Parent');
  const [formMedicalNotes, setFormMedicalNotes] = useState('');
  const [formCheckinInterval, setFormCheckinInterval] = useState(48);

  // Bulk CSV state
  const [bulkCsvText, setBulkCsvText] = useState('');

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await fetchStudents({
        search: search.trim() || undefined,
        status: statusFilter,
        limit: 100,
      });
      setStudents(res.students);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [search, statusFilter]);

  const handleOpenAdd = () => {
    setFormEmail('');
    setFormFullName('');
    setFormDorm('');
    setFormRoom('');
    setFormContactName('');
    setFormContactPhone('');
    setFormContactRelation('Parent');
    setFormMedicalNotes('');
    setFormCheckinInterval(48);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (s: StudentListItem) => {
    setSelectedStudent(s);
    setFormEmail(s.universityEmail);
    setFormFullName(s.fullName);
    setFormDorm(s.dormBuilding || '');
    setFormRoom(s.roomNumber || '');
    setFormContactName(s.emergencyContactName || '');
    setFormContactPhone(s.emergencyContactPhone || '');
    setFormMedicalNotes(s.medicalNotes || '');
    setFormCheckinInterval(s.checkinIntervalHours || 48);
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createStudent({
        universityEmail: formEmail,
        profile: {
          fullName: formFullName,
          dormBuilding: formDorm || undefined,
          roomNumber: formRoom || undefined,
          emergencyContacts: [
            {
              name: formContactName,
              phone: formContactPhone,
              relationship: formContactRelation,
            },
          ],
          medicalNotes: formMedicalNotes || undefined,
        },
        checkinIntervalHours: formCheckinInterval,
      });
      setIsAddModalOpen(false);
      loadStudents();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      await updateStudent(selectedStudent.studentId, {
        universityEmail: formEmail,
        profile: {
          fullName: formFullName,
          dormBuilding: formDorm || undefined,
          roomNumber: formRoom || undefined,
          medicalNotes: formMedicalNotes || undefined,
        },
        checkinIntervalHours: formCheckinInterval,
      });
      setIsEditModalOpen(false);
      loadStudents();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDelete = async (studentId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from CampusShield?`)) return;
    try {
      await deleteStudent(studentId);
      if (selectedStudent?.studentId === studentId) setSelectedStudent(null);
      loadStudents();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkCsvText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const parsedRows = lines.map((line) => {
      // Format: FullName,Email,Dorm,Room,ContactName,ContactPhone
      const parts = line.split(',').map((p) => p.trim());
      return {
        universityEmail: parts[1] || `${parts[0]?.toLowerCase().replace(/\s+/g, '')}@university.edu`,
        profile: {
          fullName: parts[0] || 'Student',
          dormBuilding: parts[2] || 'Dorm Quad',
          roomNumber: parts[3] || '101',
          emergencyContacts: [
            {
              name: parts[4] || 'Emergency Contact',
              phone: parts[5] || '+1-555-0000',
              relationship: 'Parent',
            },
          ],
        },
        checkinIntervalHours: 48,
      };
    });

    try {
      const res = await bulkImportStudents(parsedRows);
      alert(`Successfully imported ${res.importedCount} student records!`);
      setIsBulkModalOpen(false);
      setBulkCsvText('');
      loadStudents();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  // Stats calculation
  const safeCount = students.filter((s) => s.status === 'SAFE').length;
  const overdueCount = students.filter((s) => s.status === 'OVERDUE').length;
  const tripCount = students.filter((s) => s.status === 'ACTIVE_TRIP').length;

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950">
      {/* Main Student Directory Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Student Safety Registry</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {total} Enrolled
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Bulk CSV Import</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 btn-brand-primary rounded-lg text-xs font-semibold shadow-md flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Enroll New Student</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 p-4 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Registry</div>
              <div className="text-xl font-bold text-white mt-0.5">{total}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">👥</div>
          </div>

          <div className="bg-slate-900 border border-emerald-950/50 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-emerald-400 uppercase font-semibold">Safe & Active</div>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">{safeCount}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center text-emerald-400">✓</div>
          </div>

          <div className="bg-slate-900 border border-amber-950/50 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-amber-400 uppercase font-semibold">Check-In Overdue</div>
              <div className="text-xl font-bold text-amber-400 mt-0.5">{overdueCount}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-950/40 border border-amber-800/40 flex items-center justify-center text-amber-400">⚠️</div>
          </div>

          <div className="bg-slate-900 border border-sky-950/50 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-sky-400 uppercase font-semibold">On Safe Trips</div>
              <div className="text-xl font-bold text-sky-400 mt-0.5">{tripCount}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-sky-950/40 border border-sky-800/40 flex items-center justify-center text-sky-400">📍</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 bg-slate-900/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex-1 max-w-md relative">
            <input
              type="text"
              placeholder="Search by student name, email, or dorm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 pl-8 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <svg className="w-4 h-4 text-slate-500 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 text-xs">
            {['ALL', 'SAFE', 'OVERDUE', 'ACTIVE_TRIP'].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  statusFilter === f
                    ? 'btn-brand-primary font-medium shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {f === 'ALL' ? 'All Students' : f === 'ACTIVE_TRIP' ? 'In Transit' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Students Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Loading student registry...</div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">No students match your filter criteria.</div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Dorm / Residence</th>
                  <th className="py-2.5 px-4">Emergency Contact</th>
                  <th className="py-2.5 px-4">Check-In Status</th>
                  <th className="py-2.5 px-4">Medical Alert</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {students.map((student) => {
                  const isSelected = selectedStudent?.studentId === student.studentId;

                  return (
                    <tr
                      key={student.studentId}
                      onClick={() => setSelectedStudent(student)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-sky-950/40 border-l-2 border-sky-500'
                          : 'hover:bg-slate-900/60'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sky-400 shrink-0">
                            {student.fullName[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{student.fullName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{student.universityEmail}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        {student.dormBuilding ? (
                          <div>
                            <div>{student.dormBuilding}</div>
                            {student.roomNumber && (
                              <div className="text-[11px] text-slate-400">Room {student.roomNumber}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Off-Campus</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {student.emergencyContactName ? (
                          <div>
                            <div className="text-slate-200">{student.emergencyContactName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{student.emergencyContactPhone}</div>
                          </div>
                        ) : (
                          <span className="text-amber-500/80 text-[11px]">Unregistered</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            student.status === 'SAFE'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : student.status === 'ACTIVE_TRIP'
                              ? 'bg-sky-950 text-sky-400 border border-sky-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                          }`}
                        >
                          {student.status === 'ACTIVE_TRIP' ? 'Active Trip' : student.status}
                        </span>
                        {student.nextCheckinDue && (
                          <div className="text-[10px] text-slate-400 mt-1">
                            Due: {new Date(student.nextCheckinDue).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {student.medicalNotes && student.medicalNotes !== 'None' ? (
                          <span className="px-1.5 py-0.5 rounded bg-red-950 border border-red-800 text-red-300 text-[10px] font-semibold">
                            ⚠️ {student.medicalNotes.slice(0, 24)}...
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenEdit(student)}
                            title="Edit Student"
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(student.studentId, student.fullName)}
                            title="Remove Student"
                            className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Student Details Side Panel (When a student is clicked) */}
      {selectedStudent && (
        <div className="w-80 border-l border-slate-800 bg-slate-900 p-4 flex flex-col shrink-0 overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <span className="text-[11px] font-bold tracking-wider uppercase text-sky-400">Student Profile</span>
            <button
              onClick={() => setSelectedStudent(null)}
              className="text-slate-400 hover:text-white text-sm"
            >
              ✕
            </button>
          </div>

          <div className="text-center mb-4">
            <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-sky-500/40 mx-auto flex items-center justify-center font-bold text-xl text-sky-400 mb-2">
              {selectedStudent.fullName[0]}
            </div>
            <h3 className="font-bold text-white text-base">{selectedStudent.fullName}</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedStudent.universityEmail}</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Campus Residence</span>
              <span className="text-slate-200 font-medium">
                {selectedStudent.dormBuilding || 'Off-Campus'} {selectedStudent.roomNumber ? `• Rm ${selectedStudent.roomNumber}` : ''}
              </span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Emergency Contact</span>
              <span className="text-slate-200 font-medium block">{selectedStudent.emergencyContactName || 'None'}</span>
              {selectedStudent.emergencyContactPhone && (
                <span className="text-sky-400 font-mono mt-0.5 block">{selectedStudent.emergencyContactPhone}</span>
              )}
            </div>

            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Medical & Safety Notes</span>
              <span className="text-slate-300 block mt-0.5">
                {selectedStudent.medicalNotes || 'No special medical conditions or allergies logged.'}
              </span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Anti-Coercion 3-Password Status</span>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedStudent.factorsConfigured
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}>
                {selectedStudent.factorsConfigured ? '✓ Configured & Encrypted' : 'Pending Onboarding'}
              </span>
            </div>

            <div className="pt-2">
              <button
                onClick={() => handleOpenEdit(selectedStudent)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs transition-colors mb-2"
              >
                Edit Student Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-1">Enroll New Student</h3>
            <p className="text-xs text-slate-400 mb-4">
              Add a student to the encrypted safety registry. Profile data is protected by Identity Escrow.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Jane Doe"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">University Email (.edu) *</label>
                <input
                  type="email"
                  required
                  placeholder="jdoe@university.edu"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Dormitory Building</label>
                  <input
                    type="text"
                    placeholder="West Campus Quad"
                    value={formDorm}
                    onChange={(e) => setFormDorm(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Room #</label>
                  <input
                    type="text"
                    placeholder="304-B"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Emergency Contact Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Parent / Guardian Name"
                    value={formContactName}
                    onChange={(e) => setFormContactName(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Relation</label>
                  <input
                    type="text"
                    placeholder="Parent"
                    value={formContactRelation}
                    onChange={(e) => setFormContactRelation(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Emergency Contact Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+1 (555) 019-2834"
                  value={formContactPhone}
                  onChange={(e) => setFormContactPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Medical Notes / Critical Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Asthma, EpiPen in backpack, Diabetes"
                  value={formMedicalNotes}
                  onChange={(e) => setFormMedicalNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Safety Check-In Interval</label>
                <select
                  value={formCheckinInterval}
                  onChange={(e) => setFormCheckinInterval(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                >
                  <option value={24}>Every 24 Hours (High Caution)</option>
                  <option value={48}>Every 48 Hours (Standard)</option>
                  <option value={72}>Every 72 Hours (Relaxed)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 btn-brand-primary font-semibold rounded-lg shadow"
                >
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-3">Edit Student Details</h3>
            <form onSubmit={handleUpdateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">University Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Dormitory</label>
                  <input
                    type="text"
                    value={formDorm}
                    onChange={(e) => setFormDorm(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Room #</label>
                  <input
                    type="text"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Medical Notes</label>
                <input
                  type="text"
                  value={formMedicalNotes}
                  onChange={(e) => setFormMedicalNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 btn-brand-primary font-semibold rounded-lg shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Bulk CSV Student Import</h3>
            <p className="text-xs text-slate-400 mb-3">
              Paste comma-separated rows. Expected columns:
              <br />
              <code className="text-sky-300 font-mono">FullName, Email, DormBuilding, RoomNumber, ContactName, ContactPhone</code>
            </p>

            <form onSubmit={handleBulkSubmit}>
              <textarea
                rows={7}
                placeholder="Emma Watson, ewatson@university.edu, North Quad, 302, John Watson, +1-555-0199
Lucas Vance, lvance@university.edu, South Hall, 104, Mary Vance, +1-555-0188"
                value={bulkCsvText}
                onChange={(e) => setBulkCsvText(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs font-mono mb-4 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />

              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>{bulkCsvText.split('\n').filter((l) => l.trim()).length} lines detected</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBulkModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!bulkCsvText.trim()}
                    className="px-4 py-2 btn-brand-primary font-semibold rounded-lg shadow disabled:opacity-50"
                  >
                    Import All
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
