'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { AnonymizedTrip, AlertItem } from '../types';

interface MapProps {
  trips: AnonymizedTrip[];
  alerts: AlertItem[];
  selectedTripToken: string | null;
  onSelectTrip: (tripToken: string) => void;
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
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const policeMarkersRef = useRef<Map<string, any>>(new Map());
  const [showPoliceStations, setShowPoliceStations] = useState(true);

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
          <div style="font-family: inherit; font-size: 13px; color: #0f172a; padding: 4px; min-width: 220px;">
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
  }, [trips, alerts, onSelectTrip]);

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

      {/* Top Police Layer Toggle */}
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
      </div>

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
