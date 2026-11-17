'use client';

import React, { useEffect, useRef } from 'react';
import type { AnonymizedTrip, AlertItem } from '../types';

interface MapProps {
  trips: AnonymizedTrip[];
  alerts: AlertItem[];
  selectedTripToken: string | null;
  onSelectTrip: (tripToken: string) => void;
}

export default function SecurityMap({
  trips,
  alerts,
  selectedTripToken,
  onSelectTrip,
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  // Initialize Leaflet map once on client
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Default center: Campus coordinates (defaulting to standard center, e.g. 40.7128, -74.006)
      const map = L.map(mapContainerRef.current, {
        center: [40.7128, -74.006],
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

        const popupContent = `
          <div style="font-family: inherit; font-size: 13px; color: #0f172a; padding: 4px;">
            <div style="font-weight: 700; margin-bottom: 2px;">
              ${displayName ? `🚨 ${displayName}` : `Session: ${shortToken}`}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
              Status: <span style="font-weight: 600; color: ${hasAlert ? '#ef4444' : '#059669'};">${trip.status}</span>
            </div>
            <div style="font-size: 11px; color: #475569;">
              Battery: ${trip.batteryPct ?? 'N/A'}% | Last Ping: ${new Date(trip.updatedAt).toLocaleTimeString()}
            </div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 4px; font-style: italic;">
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

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-3 shadow-xl text-xs space-y-1.5">
        <div className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          Live Monitoring Legend
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Normal Active (Anonymous)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Pre-Alarm Grace Period (60s)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span>Emergency Alert (Unlocked)</span>
        </div>
      </div>
    </div>
  );
}
