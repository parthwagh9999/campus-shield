import type { PoliceStation, StudentProfile, Alert } from './police.schemas.js';
import { createLogger } from '../../config/logger.js';

const log = createLogger('police-service');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const OVERPASS_URL =
  process.env.OVERPASS_API_URL ?? 'https://overpass-api.de/api/interpreter';

// ---------------------------------------------------------------------------
// Verified UCR & Riverside Police Stations (High-Availability Fallback)
// ---------------------------------------------------------------------------

const VERIFIED_UCR_POLICE_STATIONS: Array<{
  name: string;
  lat: number;
  lng: number;
  phone: string;
  address: string;
}> = [
  {
    name: 'UC Riverside Police Department (UCPD Headquarters)',
    lat: 33.9744,
    lng: -117.3248,
    phone: '(951) 827-5222',
    address: '3500 Canyon Crest Dr, Riverside, CA 92507',
  },
  {
    name: 'Riverside Police Department - Eastside Substation',
    lat: 33.9772,
    lng: -117.3621,
    phone: '(951) 826-5700',
    address: '4102 University Ave, Riverside, CA 92501',
  },
  {
    name: 'Riverside Police Department - Central Headquarters',
    lat: 33.9806,
    lng: -117.3756,
    phone: '(951) 826-5700',
    address: '4102 Orange St, Riverside, CA 92501',
  },
  {
    name: "Riverside County Sheriff's Department",
    lat: 33.9818,
    lng: -117.3735,
    phone: '(951) 955-2400',
    address: '4095 Lemon St, Riverside, CA 92501',
  },
  {
    name: 'Riverside Police Department - Orangecrest Station',
    lat: 33.8872,
    lng: -117.3214,
    phone: '(951) 351-6000',
    address: '9415 Mission Grove Pkwy, Riverside, CA 92508',
  },
];

// ---------------------------------------------------------------------------
// findNearestPoliceStation
// ---------------------------------------------------------------------------

/**
 * Query the Overpass API (OpenStreetMap) for amenity=police nodes/ways
 * within `radiusKm` of the given coordinates. Results are sorted by
 * distance (ascending). Includes fallback to verified local police registry.
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

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'CampusShield-EmergencyDispatch/1.0 (ucpd-dispatch@ucr.edu; safety-dispatch-console)',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) {
      const data = (await response.json()) as OverpassResponse;
      if (data.elements && data.elements.length > 0) {
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

        stations.sort((a, b) => a.distanceKm - b.distanceKm);
        return stations;
      }
    } else {
      log.warn('Overpass API returned non-OK status, falling back to local registry', { status: response.status });
    }
  } catch (err) {
    log.warn('Overpass API query failed or timed out, utilizing local verified police registry', {
      error: (err as Error).message,
    });
  }

  // High-availability verified fallback
  const fallbackStations: PoliceStation[] = VERIFIED_UCR_POLICE_STATIONS.map((s) => ({
    ...s,
    distanceKm: haversineKm(lat, lng, s.lat, s.lng),
  }))
    .filter((s) => s.distanceKm <= radiusKm + 1.0)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return fallbackStations;
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
