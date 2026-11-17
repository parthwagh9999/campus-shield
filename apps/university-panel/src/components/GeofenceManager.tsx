'use client';

import React, { useState, useEffect } from 'react';
import type { CampusGeofence } from '../types';
import { fetchGeofences, createGeofence, deleteGeofence } from '../lib/api';

export default function GeofenceManager() {
  const [geofences, setGeofences] = useState<CampusGeofence[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CampusGeofence['category']>('SAFE_CORRIDOR');
  const [color, setColor] = useState('#3b82f6');
  const [radiusMeters, setRadiusMeters] = useState(800);
  const [description, setDescription] = useState('');

  const loadGeofences = async () => {
    setLoading(true);
    try {
      const data = await fetchGeofences();
      setGeofences(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGeofences();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createGeofence({
        name,
        category,
        color,
        centerLat: 40.7128,
        centerLng: -74.0060,
        radiusMeters,
        description,
        alertOnExit: false,
      });
      setIsAddOpen(false);
      setName('');
      setDescription('');
      loadGeofences();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this campus geofence safety boundary?')) return;
    try {
      await deleteGeofence(id);
      loadGeofences();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>Campus Safety Geofences & Designated Corridors</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure university-managed safe perimeters, Blue Light emergency corridors, and perimeter alert policies.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-semibold text-white shadow transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Safety Zone</span>
        </button>
      </div>

      {/* Grid of Geofence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-8">
        {geofences.map((gf) => (
          <div
            key={gf.id}
            className="p-4 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden flex flex-col justify-between"
          >
            {/* Category top stripe */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: gf.color }}
            />

            <div>
              <div className="flex items-center justify-between mb-2 mt-1">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase"
                  style={{ backgroundColor: `${gf.color}25`, color: gf.color }}
                >
                  {gf.category.replace('_', ' ')}
                </span>
                <span className="text-xs font-mono text-slate-400">{gf.radiusMeters}m radius</span>
              </div>

              <h4 className="font-bold text-white text-sm mb-1">{gf.name}</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{gf.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Patrolled Zone</span>
              </div>
              <button
                onClick={() => handleDelete(gf.id)}
                className="text-slate-500 hover:text-red-400 transition-colors"
                title="Delete Geofence"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Define Campus Geofence</h3>
            <p className="text-xs text-slate-400 mb-4">
              Add a monitored safety zone to guide dispatch triage and student trip safe perimeters.
            </p>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Zone Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Quad Night Escort Zone"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                >
                  <option value="CAMPUS_PERIMETER">Main Campus Perimeter</option>
                  <option value="SAFE_CORRIDOR">Safe Transit / Blue Light Corridor</option>
                  <option value="DORM_QUAD">Residential / Dormitory Quad</option>
                  <option value="HIGH_ALERT_ZONE">High Caution / Restricted Zone</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Radius: {radiusMeters} meters</label>
                <input
                  type="range"
                  min={200}
                  max={5000}
                  step={100}
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Zone Pin Color</label>
                <div className="flex gap-2">
                  {['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        color === c ? 'scale-125 border-white shadow' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Description / Patrol Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Notes for security officers regarding this zone..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow"
                >
                  Save Zone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
