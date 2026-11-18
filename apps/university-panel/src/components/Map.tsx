'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { AnonymizedTrip, AlertItem, TripDayPath } from '../types';

interface MapProps {
  trips: AnonymizedTrip[];
  alerts: AlertItem[];
  selectedTripToken: string | null;
  onSelectTrip: (tripToken: string) => void;
  activePath?: TripDayPath | null;
  onClearPath?: () => void;
  onRequestPath?: (tripToken: string) => void;
}

export interface VerifiedPoliceStation {
  id: string;
  name: string;
  division: string;
  address: string;
  phone: string;
  emergencyPhone: string;
  lat: number;
  lng: number;
  distanceKm: number;
}

export const VERIFIED_POLICE_STATIONS: VerifiedPoliceStation[] = [
  {
    id: 'ucpd-main',
    name: 'UC Riverside Police Department (UCPD)',
    division: 'Primary Campus Command & 24/7 Highlander Dispatch',
    address: '3500 Canyon Crest Dr, Riverside, CA 92507',
    phone: '(951) 827-5222',
    emergencyPhone: '911 / (951) 827-5222',
    lat: 33.9744,
    lng: -117.3248,
    distanceKm: 0.28,
  },
  {
    id: 'rpd-eastside',
    name: 'Riverside Police Department - Eastside Substation',
    division: 'University Ave Commercial Corridor & District 2 Patrol',
    address: '2099 University Ave, Riverside, CA 92507',
    phone: '(951) 826-5388',
    emergencyPhone: '911',
    lat: 33.9772,
    lng: -117.3551,
    distanceKm: 2.51,
  },
  {
    id: 'rpd-hq',
    name: 'Riverside Police Department - Central Headquarters',
    division: 'City of Riverside Law Enforcement & Tactical Support',
    address: '4102 Orange St, Riverside, CA 92501',
    phone: '(951) 826-5700',
    emergencyPhone: '911',
    lat: 33.9806,
    lng: -117.3755,
    distanceKm: 4.62,
  },
  {
    id: 'chp-riverside',
    name: 'California Highway Patrol (CHP) - Riverside Area',
    division: 'State Highway Safety (CA-60 & I-215 Campus Corridors)',
    address: '8118 Lincoln Ave, Riverside, CA 92504',
    phone: '(951) 637-8000',
    emergencyPhone: '911',
    lat: 33.9218,
    lng: -117.4095,
    distanceKm: 9.24,
  },
  {
    id: 'rcso-jurupa',
    name: 'Riverside County Sheriff’s Department (RCSO)',
    division: 'Riverside County Mutual Aid & Search Operations',
    address: '7477 Mission Blvd, Jurupa Valley, CA 92509',
    phone: '(951) 955-2600',
    emergencyPhone: '911',
    lat: 33.9868,
    lng: -117.4320,
    distanceKm: 9.85,
  },
];

export default function SecurityMap({
  trips,
  alerts,
  selectedTripToken,
  onSelectTrip,
  activePath,
  onClearPath,
  onRequestPath,
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const policeMarkersRef = useRef<Map<string, any>>(new Map());
  const pathLayersRef = useRef<any[]>([]);
  const [showPoliceStations, setShowPoliceStations] = useState(true);
  const [isPathDetailsOpen, setIsPathDetailsOpen] = useState(true);

  // Initialize Leaflet map once on client
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Default center: UC Riverside Campus coordinates (33.9737, -117.3281)
      const map = L.map(mapContainerRef.current, {
        center: [33.9737, -117.3281],
        zoom: 14,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Free OpenStreetMap raster tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update trip markers when trips or alerts change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const currentTokens = new Set<string>();

      trips.forEach((trip) => {
        if (!trip.lat || !trip.lng) return;
        currentTokens.add(trip.tripToken);

        const hasAlert = alerts.some((a) => a.tripToken === trip.tripToken && a.status !== 'RESOLVED');
        const alertObj = alerts.find((a) => a.tripToken === trip.tripToken && a.status !== 'RESOLVED');

        let pinClass = 'active';
        if (hasAlert || trip.status.startsWith('ALERT_')) {
          pinClass = 'alert';
        } else if (trip.status === 'GRACE_PERIOD') {
          pinClass = 'grace';
        } else if (trip.batteryPct !== null && trip.batteryPct < 15) {
          pinClass = 'battery';
        }

        const customIcon = L.divIcon({
          className: 'custom-trip-marker',
          html: `<div class="trip-marker-pin ${pinClass}" title="${trip.tripToken}"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const shortToken = trip.tripToken.slice(0, 8);
        const displayName = alertObj?.decryptedProfile?.fullName || alertObj?.decryptedProfile?.name;
        const police = alertObj?.nearestPolice?.[0];

        const popupContent = `
          <div style="font-family: inherit; font-size: 13px; color: #0f172a; padding: 4px; min-width: 230px;">
            <div style="font-weight: 700; margin-bottom: 2px;">
              ${displayName ? `🚨 ${displayName}` : `Session: ${shortToken}`}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">
              Status: <span style="font-weight: 600; color: ${hasAlert ? '#ef4444' : '#059669'};">${trip.status}</span>
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
              Battery: ${trip.batteryPct ?? 'N/A'}% | Last Ping: ${new Date(trip.updatedAt).toLocaleTimeString()}
            </div>
            ${police ? `
              <div style="margin-top: 6px; padding: 6px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; font-size: 11px;">
                <div style="font-weight: 700; color: #991b1b;">
                  🚔 ${police.name}
                </div>
                <div style="margin-top: 2px;">
                  <a href="tel:${police.phone || '(951) 827-5222'}" style="color: #b91c1c; font-weight: 700; text-decoration: underline; font-family: monospace;">
                    📞 ${police.phone || '(951) 827-5222'}
                  </a>
                  <span style="color: #64748b; font-size: 10px;"> (${police.distanceKm.toFixed(2)} km)</span>
                </div>
              </div>
            ` : ''}
            ${(hasAlert || trip.status.startsWith('ALERT_')) ? `
              <div style="margin-top: 8px;">
                <button
                  id="btn-day-path-${trip.tripToken}"
                  type="button"
                  style="
                    width: 100%;
                    padding: 6px 10px;
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: #000000;
                    font-weight: 800;
                    font-size: 11px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.15);
                  "
                >
                  🗺️ Show Today's Full Path
                </button>
              </div>
            ` : ''}
            <div style="font-size: 10px; color: #94a3b8; margin-top: 6px; font-style: italic;">
              ${displayName ? 'Identity unlocked via emergency trigger' : 'Privacy-by-default: Anonymous session'}
            </div>
          </div>
        `;

        if (markersRef.current.has(trip.tripToken)) {
          const marker = markersRef.current.get(trip.tripToken);
          marker.setLatLng([trip.lat, trip.lng]);
          marker.setIcon(customIcon);
          marker.getPopup()?.setContent(popupContent);
        } else {
          const marker = L.marker([trip.lat, trip.lng], { icon: customIcon })
            .addTo(map)
            .bindPopup(popupContent);

          marker.on('click', () => {
            onSelectTrip(trip.tripToken);
            if ((hasAlert || trip.status.startsWith('ALERT_')) && onRequestPath) {
              onRequestPath(trip.tripToken);
            }
          });

          marker.on('popupopen', () => {
            const btn = document.getElementById(`btn-day-path-${trip.tripToken}`);
            if (btn && onRequestPath) {
              btn.onclick = (e) => {
                e.stopPropagation();
                onRequestPath(trip.tripToken);
              };
            }
          });

          markersRef.current.set(trip.tripToken, marker);
        }
      });

      // Remove stale markers
      markersRef.current.forEach((marker, token) => {
        if (!currentTokens.has(token)) {
          marker.remove();
          markersRef.current.delete(token);
        }
      });
    });
  }, [trips, alerts, onSelectTrip, onRequestPath]);

  // Render or remove police station markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      if (!showPoliceStations) {
        policeMarkersRef.current.forEach((marker) => marker.remove());
        policeMarkersRef.current.clear();
        return;
      }

      VERIFIED_POLICE_STATIONS.forEach((station) => {
        if (policeMarkersRef.current.has(station.id)) return;

        const policeIcon = L.divIcon({
          className: 'police-station-marker',
          html: `
            <div style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: #003B5C;
              border: 2px solid #FFB81C;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 0 12px rgba(0, 59, 92, 0.8), 0 2px 4px rgba(0,0,0,0.5);
              cursor: pointer;
              font-size: 16px;
            ">
              🚔
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const popupHtml = `
          <div style="font-family: inherit; font-size: 13px; color: #0f172a; padding: 6px; min-width: 250px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
              <span style="font-size: 18px;">🚔</span>
              <div>
                <div style="font-weight: 800; color: #003B5C; font-size: 13px; line-height: 1.2;">
                  ${station.name}
                </div>
                <div style="font-size: 10px; color: #64748b; font-weight: 600;">
                  ${station.division}
                </div>
              </div>
            </div>

            <div style="margin-top: 6px; font-size: 11px; color: #334155; line-height: 1.4;">
              📍 <strong>Address:</strong> ${station.address}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              📏 <strong>Distance to UCR Campus:</strong> ${station.distanceKm.toFixed(2)} km
            </div>

            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 4px;">
              <a href="tel:${station.phone}" style="
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding: 6px 10px;
                background-color: #003B5C;
                color: #ffffff;
                font-weight: 700;
                font-family: monospace;
                font-size: 12px;
                border-radius: 6px;
                text-decoration: none;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              ">
                📞 Call Dispatch: ${station.phone}
              </a>
              <div style="font-size: 10px; text-align: center; color: #dc2626; font-weight: 700; margin-top: 2px;">
                Emergency Direct: 911
              </div>
            </div>
          </div>
        `;

        const marker = L.marker([station.lat, station.lng], { icon: policeIcon })
          .addTo(map)
          .bindPopup(popupHtml);

        policeMarkersRef.current.set(station.id, marker);
      });
    });
  }, [showPoliceStations]);

  // Draw full day trajectory when activePath changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clean up previous path layers
    pathLayersRef.current.forEach((layer) => layer.remove());
    pathLayersRef.current = [];

    if (!activePath || !activePath.waypoints || activePath.waypoints.length === 0) {
      return;
    }

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const latLngs = activePath.waypoints.map((wp) => [wp.lat, wp.lng] as [number, number]);

      // 1. Ambient Golden/Amber Outer Glow Polyline
      const glowPolyline = L.polyline(latLngs, {
        color: '#f59e0b',
        weight: 10,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      pathLayersRef.current.push(glowPolyline);

      // 2. High-contrast Crisp Trajectory Polyline
      const mainPolyline = L.polyline(latLngs, {
        color: '#dc2626',
        weight: 4,
        opacity: 0.95,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      pathLayersRef.current.push(mainPolyline);

      // 3. Waypoint markers along the route
      activePath.waypoints.forEach((wp, index) => {
        const isStart = wp.isStartPoint || index === 0;
        const isIncident = wp.isIncidentPoint || index === activePath.waypoints.length - 1;
        const timeStr = new Date(wp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let iconHtml = '';
        let iconSize: [number, number] = [24, 24];
        let iconAnchor: [number, number] = [12, 12];

        if (isIncident) {
          iconHtml = `
            <div style="
              width: 38px;
              height: 38px;
              border-radius: 50%;
              background: #dc2626;
              border: 3px solid #ffffff;
              box-shadow: 0 0 24px #ef4444, 0 4px 8px rgba(0,0,0,0.6);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-size: 18px;
              cursor: pointer;
            ">🚨</div>
          `;
          iconSize = [38, 38];
          iconAnchor = [19, 19];
        } else if (isStart) {
          iconHtml = `
            <div style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: #16a34a;
              border: 2px solid #ffffff;
              box-shadow: 0 0 16px rgba(22, 163, 74, 0.9), 0 2px 4px rgba(0,0,0,0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-size: 15px;
              font-weight: 800;
              cursor: pointer;
            ">🏁</div>
          `;
          iconSize = [32, 32];
          iconAnchor = [16, 16];
        } else {
          iconHtml = `
            <div style="
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: #0f172a;
              border: 2px solid #f59e0b;
              box-shadow: 0 0 10px rgba(245, 158, 11, 0.7);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #f59e0b;
              font-size: 11px;
              font-weight: 800;
              font-family: monospace;
              cursor: pointer;
            ">${index + 1}</div>
          `;
          iconSize = [24, 24];
          iconAnchor = [12, 12];
        }

        const icon = L.divIcon({
          className: 'trajectory-waypoint-icon',
          html: iconHtml,
          iconSize,
          iconAnchor,
        });

        const popupHtml = `
          <div style="font-family: inherit; font-size: 12px; color: #0f172a; padding: 4px; min-width: 210px;">
            <div style="font-weight: 800; color: ${isIncident ? '#dc2626' : isStart ? '#16a34a' : '#003B5C'}; font-size: 13px; margin-bottom: 2px;">
              ${isIncident ? '🚨 Incident Trigger Point' : isStart ? '🏁 Start Point (Departure)' : `📍 Waypoint #${index + 1}`}
            </div>
            <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">
              ${wp.label || 'Campus Location'}
            </div>
            <div style="font-size: 11px; color: #475569;">
              🕒 Time: <strong>${timeStr}</strong>
            </div>
            ${wp.batteryPct !== undefined ? `
              <div style="font-size: 11px; color: #475569;">
                🔋 Battery: <strong>${wp.batteryPct}%</strong>
              </div>
            ` : ''}
            ${wp.speed !== undefined ? `
              <div style="font-size: 11px; color: #475569;">
                ⚡ Speed: <strong>${wp.speed.toFixed(1)} m/s</strong>
              </div>
            ` : ''}
            <div style="font-size: 10px; color: #94a3b8; font-family: monospace; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1;">
              Coords: ${wp.lat.toFixed(5)}, ${wp.lng.toFixed(5)}
            </div>
          </div>
        `;

        const marker = L.marker([wp.lat, wp.lng], { icon })
          .addTo(map)
          .bindPopup(popupHtml);

        pathLayersRef.current.push(marker);
      });

      // Fit map viewport smoothly around the full trajectory
      try {
        const bounds = mainPolyline.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
        }
      } catch (err) {}
    });
  }, [activePath]);

  // Pan to selected trip when changed
  useEffect(() => {
    if (!selectedTripToken || !mapInstanceRef.current) return;
    const marker = markersRef.current.get(selectedTripToken);
    if (marker) {
      mapInstanceRef.current.setView(marker.getLatLng(), 16, { animate: true });
      marker.openPopup();
    }
  }, [selectedTripToken]);

  return (
    <div className="relative w-full h-full bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Police Layer Toggle & Live Student Counter */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowPoliceStations((prev) => !prev)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xl border transition-all ${
            showPoliceStations
              ? 'bg-slate-900/95 text-white border-amber-500/70 shadow-amber-500/10'
              : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white'
          }`}
        >
          <span>🚔</span>
          <span>Police Stations: {showPoliceStations ? 'VISIBLE (5 Verified)' : 'HIDDEN'}</span>
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: showPoliceStations ? '#10b981' : '#64748b' }}
          />
        </button>

        <div className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-900/95 text-white border border-emerald-500/70 shadow-xl shadow-emerald-500/10 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live Students Monitored: <strong className="text-emerald-400 font-mono">{trips.length} Active</strong></span>
        </div>
      </div>

      {/* Active Day Path Trajectory Summary Card */}
      {activePath && (
        <div className="absolute top-4 right-4 z-20 w-80 max-h-[85vh] bg-slate-900/95 backdrop-blur-md border border-amber-500/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-xs">
          {/* Card Header */}
          <div className="p-3 bg-gradient-to-r from-amber-950/80 to-slate-900 border-b border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🗺️</span>
              <div>
                <h3 className="font-bold text-white text-xs leading-none">
                  Today's Student Trajectory
                </h3>
                <span className="text-[10px] text-amber-400 font-mono">
                  {activePath.studentName || `Token: ${activePath.tripToken.slice(0, 8)}`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsPathDetailsOpen(!isPathDetailsOpen)}
                className="p-1 rounded text-slate-400 hover:text-white"
                title={isPathDetailsOpen ? 'Collapse timeline' : 'Expand timeline'}
              >
                {isPathDetailsOpen ? '▲' : '▼'}
              </button>
              {onClearPath && (
                <button
                  type="button"
                  onClick={onClearPath}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold"
                  title="Close Trajectory Path"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="p-2.5 bg-slate-950/80 border-b border-slate-800 grid grid-cols-3 gap-2 text-center">
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">Total Distance</div>
              <div className="font-mono font-bold text-amber-400">{activePath.totalDistanceKm} km</div>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">Duration</div>
              <div className="font-mono font-bold text-white">{activePath.durationMinutes} min</div>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">Waypoints</div>
              <div className="font-mono font-bold text-emerald-400">{activePath.waypoints.length} points</div>
            </div>
          </div>

          {/* Route Terminals */}
          <div className="p-3 bg-slate-900/60 border-b border-slate-800 space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold shrink-0">🏁 Origin:</span>
              <span className="text-slate-200 truncate">{activePath.startLocation}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-400 font-bold shrink-0">🚨 Incident:</span>
              <span className="text-slate-200 truncate">{activePath.endLocation}</span>
            </div>
          </div>

          {/* Collapsible Waypoints Breadcrumbs Timeline */}
          {isPathDetailsOpen && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-64">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Chronological Breadcrumbs ({activePath.date})
              </div>
              {activePath.waypoints.map((wp, idx) => {
                const isStart = wp.isStartPoint || idx === 0;
                const isEnd = wp.isIncidentPoint || idx === activePath.waypoints.length - 1;
                return (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg border text-[11px] flex items-center justify-between transition-colors ${
                      isEnd
                        ? 'bg-red-950/40 border-red-500/50 text-red-200'
                        : isStart
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-[10px] shrink-0">
                        {isEnd ? '🚨' : isStart ? '🏁' : `#${idx + 1}`}
                      </span>
                      <div className="truncate">
                        <div className="font-semibold truncate">{wp.label || `Waypoint ${idx + 1}`}</div>
                        <div className="text-[10px] opacity-70">
                          {new Date(wp.timestamp).toLocaleTimeString()}
                          {wp.speed !== undefined ? ` • ${wp.speed.toFixed(1)} m/s` : ''}
                        </div>
                      </div>
                    </div>
                    {wp.batteryPct !== undefined && (
                      <span className="font-mono text-[10px] shrink-0 font-bold text-slate-400">
                        🔋 {wp.batteryPct}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl p-3.5 shadow-2xl text-xs space-y-2">
        <div className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span>Live Operations Map Legend</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Normal Active Safe Trip (Zero Surveillance)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Pre-Alarm Grace Period (60s Countdown)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span>Emergency Incident (Identity Sealed in Vault)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300 pt-1 border-t border-slate-800">
          <span className="text-base">🚔</span>
          <span className="font-semibold text-amber-400">Verified Police Stations (With Hotline)</span>
        </div>
      </div>
    </div>
  );
}
