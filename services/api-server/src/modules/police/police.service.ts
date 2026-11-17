import type { PoliceStation, StudentProfile, Alert } from './police.schemas.js';
import { createLogger } from '../../config/logger.js';

const log = createLogger('police-service');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const OVERPASS_URL =
  process.env.OVERPASS_API_URL ?? 'https://overpass-api.de/api/interpreter';

// ---------------------------------------------------------------------------
// findNearestPoliceStation
// ---------------------------------------------------------------------------

/**
 * Query the Overpass API (OpenStreetMap) for amenity=police nodes/ways
 * within `radiusKm` of the given coordinates.  Results are sorted by
 * distance (ascending).
 */
export async function findNearestPoliceStation(
  lat: number,
  lng: number,
  radiusKm = 10,
): Promise<PoliceStation[]> {
  const radiusMetres = Math.round(radiusKm * 1000);

  // Overpass QL – fetch nodes AND ways tagged amenity=police
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="police"](around:${radiusMetres},${lat},${lng});
      way["amenity"="police"](around:${radiusMetres},${lat},${lng});
    );
    out center body;
  `;

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    log.error('Overpass API error', { status: response.status });
    throw new Error(`Overpass API returned HTTP ${response.status}`);
  }

  const data = (await response.json()) as OverpassResponse;

  const stations: PoliceStation[] = data.elements.map((el) => {
    const elLat = el.lat ?? el.center?.lat ?? 0;
    const elLng = el.lon ?? el.center?.lon ?? 0;

    return {
      name: el.tags?.name ?? el.tags?.['name:en'] ?? 'Police Station',
      lat: elLat,
      lng: elLng,
      distanceKm: haversineKm(lat, lng, elLat, elLng),
      phone: el.tags?.phone ?? el.tags?.['contact:phone'] ?? '(951) 827-5222',
      address: formatAddress(el.tags),
    };
  });

  // Sort by distance ascending
  stations.sort((a, b) => a.distanceKm - b.distanceKm);

  return stations;
}

// ---------------------------------------------------------------------------
// generateDispatchSummary
// ---------------------------------------------------------------------------

/**
 * Produce a human-readable dispatch summary suitable for pasting into a
 * phone call or radio message.
 */
export function generateDispatchSummary(
  alert: Alert,
  student: StudentProfile,
  policeStation: PoliceStation,
): string {
  const lines: string[] = [];

  lines.push('══════════════════════════════════════════════');
  lines.push('  CAMPUSSHIELD — EMERGENCY DISPATCH SUMMARY');
  lines.push('══════════════════════════════════════════════');
  lines.push('');

  // Alert info
  lines.push(`Alert ID      : ${alert.alertId}`);
  lines.push(`Alert Type    : ${alert.alertType}`);
  lines.push(`Priority      : ${alert.priority}/5`);
  lines.push(`Created At    : ${alert.createdAt}`);
  lines.push('');

  // Student info
  lines.push('── STUDENT ──────────────────────────────────');
  lines.push(`Name          : ${student.name ?? 'Unknown'}`);
  if (student.photo) {
    lines.push(`Photo URL     : ${student.photo}`);
  }
  if (student.dorm) {
    lines.push(`Dorm / Address: ${student.dorm}`);
  }
  if (student.medicalNotes) {
    lines.push(`Medical Notes : ${student.medicalNotes}`);
  }
  if (student.emergencyContacts?.length) {
    lines.push('Emergency Contacts:');
    for (const c of student.emergencyContacts) {
      const rel = c.relation ? ` (${c.relation})` : '';
      lines.push(`  • ${c.name}${rel}: ${c.phone}`);
    }
  }
  lines.push('');

  // Location
  lines.push('── LOCATION ─────────────────────────────────');
  if (alert.lastKnownCoords) {
    const { lat, lng } = alert.lastKnownCoords;
    lines.push(`Last Known    : ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    lines.push(
      `OpenStreetMap : https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`,
    );
  } else {
    lines.push('Last Known    : coordinates unavailable');
  }
  lines.push('');

  // Police station
  lines.push('── NEAREST POLICE STATION ───────────────────');
  lines.push(`Station       : ${policeStation.name}`);
  lines.push(`Distance      : ${policeStation.distanceKm.toFixed(2)} km`);
  if (policeStation.phone) {
    lines.push(`Phone         : ${policeStation.phone}`);
  }
  if (policeStation.address) {
    lines.push(`Address       : ${policeStation.address}`);
  }
  lines.push(`Map           : https://www.openstreetmap.org/?mlat=${policeStation.lat}&mlon=${policeStation.lng}#map=17/${policeStation.lat}/${policeStation.lng}`);
  lines.push('');

  // Timeline
  lines.push('── TIMELINE ─────────────────────────────────');
  lines.push(`Trip Token    : ${alert.tripToken}`);
  lines.push(`Alert Opened  : ${alert.createdAt}`);
  lines.push(`Generated At  : ${new Date().toISOString()}`);
  lines.push('══════════════════════════════════════════════');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Haversine distance in km between two lat/lng pairs. */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Build a human-readable address from OSM tags. */
function formatAddress(tags?: Record<string, string>): string | undefined {
  if (!tags) return undefined;
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:city'],
    tags['addr:state'],
    tags['addr:postcode'],
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : undefined;
}

// ---------------------------------------------------------------------------
// Overpass API response type
// ---------------------------------------------------------------------------

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  version: number;
  elements: OverpassElement[];
}
