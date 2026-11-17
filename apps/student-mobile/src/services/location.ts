import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import * as TaskManager from 'expo-task-manager';
import { api } from './api';
import { useAppStore } from '../store';

export const LOCATION_TASK_NAME = 'CAMPUS_SHIELD_BACKGROUND_LOCATION';

// Register background location task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const latest = locations[locations.length - 1];
    if (!latest) return;

    const activeTrip = useAppStore.getState().activeTrip;
    if (!activeTrip) return;

    try {
      const batteryLevel = await Battery.getBatteryLevelAsync();
      const batteryPct = Math.round(Math.max(0, batteryLevel * 100));

      await api.sendPing({
        tripToken: activeTrip.tripToken,
        lat: latest.coords.latitude,
        lng: latest.coords.longitude,
        batteryPct,
        speed: latest.coords.speed ?? undefined,
        heading: latest.coords.heading ?? undefined,
        accuracy: latest.coords.accuracy ?? undefined,
      });

      // Dead man's switch: low battery check (< 5%)
      if (batteryPct <= 5) {
        console.warn('CRITICAL: Phone battery below 5%. Final failsafe ping pushed.');
      }
    } catch (err) {
      console.error('Failed to report background location ping:', err);
    }
  }
});

export async function requestLocationPermissions(): Promise<boolean> {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') return false;

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  return backgroundStatus === 'granted';
}

export async function startBackgroundTracking(): Promise<void> {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (!hasStarted) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 15000, // Ping every 15 seconds
      distanceInterval: 10, // Or every 10 meters
      foregroundService: {
        notificationTitle: 'CampusShield Trip Active',
        notificationBody: 'Streaming anonymous safety pings to university security escrow.',
        notificationColor: '#0ea5e9',
      },
    });
  }
}

export async function stopBackgroundTracking(): Promise<void> {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}
