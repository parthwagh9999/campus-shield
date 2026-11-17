import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { api } from '../services/api';
import { useAppStore } from '../store';
import { startBackgroundTracking, requestLocationPermissions } from '../services/location';

export default function TripScreen({ navigation }: any) {
  const [durationHours, setDurationHours] = useState<number>(2);
  const [perimeterRadiusKm, setPerimeterRadiusKm] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const setActiveTrip = useAppStore((s) => s.setActiveTrip);

  const handleStartTrip = async () => {
    setLoading(true);

    try {
      const hasPerm = await requestLocationPermissions();
      if (!hasPerm) {
        Alert.alert(
          'Location Permission Required',
          'CampusShield needs background location permission to monitor safe return perimeters while your phone is locked.',
        );
        setLoading(false);
        return;
      }

      // Get current location
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const currentLat = loc.coords.latitude;
      const currentLng = loc.coords.longitude;

      // Calculate approximate square polygon perimeter in GeoJSON format
      const latDelta = (perimeterRadiusKm / 111.0);
      const lngDelta = (perimeterRadiusKm / (111.0 * Math.cos((currentLat * Math.PI) / 180)));

      const polygonCoords: [number, number][] = [
        [currentLng - lngDelta, currentLat - latDelta],
        [currentLng + lngDelta, currentLat - latDelta],
        [currentLng + lngDelta, currentLat + latDelta],
        [currentLng - lngDelta, currentLat + latDelta],
        [currentLng - lngDelta, currentLat - latDelta], // Closed ring
      ];

      const returnDeadline = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

      const { tripToken } = await api.startTrip({
        perimeter: {
          type: 'Polygon',
          coordinates: [polygonCoords],
        },
        destination: {
          type: 'Point',
          coordinates: [currentLng, currentLat],
        },
        returnDeadline,
      });

      // Start background location updates
      await startBackgroundTracking();

      setActiveTrip({
        tripToken,
        returnDeadline,
        status: 'ACTIVE',
        perimeterRadiusMeters: perimeterRadiusKm * 1000,
      });

      Alert.alert(
        'Safe Trip Active',
        `Your trip is being anonymously monitored until ${new Date(returnDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Leaving your ${perimeterRadiusKm}km safe zone will trigger a 60-second grace alarm on your phone before alerting campus security.`,
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }],
      );
    } catch (err) {
      Alert.alert('Failed to Start Trip', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Configure Safe Trip</Text>
      <Text style={styles.sub}>
        Define your safe perimeter and expected return time. Background geofencing runs securely with zero staff surveillance.
      </Text>

      {/* Return Deadline Picker */}
      <Text style={styles.sectionTitle}>Expected Trip Duration</Text>
      <View style={styles.pickerRow}>
        {[1, 2, 4, 6].map((hours) => (
          <TouchableOpacity
            key={hours}
            onPress={() => setDurationHours(hours)}
            style={[styles.pickerBtn, durationHours === hours && styles.pickerBtnActive]}
          >
            <Text style={[styles.pickerText, durationHours === hours && styles.pickerTextActive]}>
              {hours} hr{hours > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Safe Zone Perimeter Radius */}
      <Text style={styles.sectionTitle}>Safe Zone Perimeter Radius</Text>
      <View style={styles.pickerRow}>
        {[1, 2, 5, 10].map((km) => (
          <TouchableOpacity
            key={km}
            onPress={() => setPerimeterRadiusKm(km)}
            style={[styles.pickerBtn, perimeterRadiusKm === km && styles.pickerBtnActive]}
          >
            <Text style={[styles.pickerText, perimeterRadiusKm === km && styles.pickerTextActive]}>
              {km} km
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Safety Notice Box */}
      <View style={styles.noticeBox}>
        <Text style={styles.noticeTitle}>🛡️ Privacy & Pre-Alarm Protection</Text>
        <Text style={styles.noticeText}>
          • University staff only see an anonymous rotating dot (no name, photo, or ID).
          {'\n'}• If you exit your {perimeterRadiusKm}km perimeter or miss your {durationHours}h return deadline, your phone will sound a 60-second loud pre-alarm so you can cancel false alarms before security is dispatched.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.startBtn}
        onPress={handleStartTrip}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.startBtnText}>Start Anonymous Trip ➔</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  sub: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 24,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 10,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  pickerBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  pickerBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  pickerText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  pickerTextActive: {
    color: '#ffffff',
  },
  noticeBox: {
    padding: 16,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginVertical: 16,
  },
  noticeTitle: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  noticeText: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  startBtn: {
    height: 50,
    backgroundColor: '#0284c7',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
