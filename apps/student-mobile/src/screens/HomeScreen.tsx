import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import SOSButton from '../components/SOSButton';
import { useAppStore } from '../store';
import { api } from '../services/api';
import { stopBackgroundTracking } from '../services/location';

export default function HomeScreen({ navigation }: any) {
  const { universityEmail, nextCheckinDue, activeTrip, setActiveTrip, logout } = useAppStore();
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Countdown timer for next periodic checkin
  useEffect(() => {
    if (!nextCheckinDue) return;

    const updateTimer = () => {
      const now = Date.now();
      const due = new Date(nextCheckinDue).getTime();
      const diff = due - now;

      if (diff <= 0) {
        setTimeRemaining('Overdue! Check in immediately.');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [nextCheckinDue]);

  const handleSOS = async () => {
    try {
      if (activeTrip?.tripToken) {
        await api.triggerSOS(activeTrip.tripToken);
      }
      navigation.navigate('SOS');
    } catch {
      navigation.navigate('SOS');
    }
  };

  const handleEndTrip = async () => {
    if (!activeTrip) return;
    try {
      await api.endTrip(activeTrip.tripToken);
      await stopBackgroundTracking();
      setActiveTrip(null);
      Alert.alert('Trip Ended', 'You have marked yourself safe. Background location streaming stopped.');
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>CampusShield</Text>
          <Text style={styles.brandSub}>{universityEmail || 'Student Safe'}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Identity Escrow Status Pill */}
      <View style={styles.escrowCard}>
        <View style={styles.escrowIndicator} />
        <View style={{ flex: 1 }}>
          <Text style={styles.escrowTitle}>Zero-Surveillance Mode Active</Text>
          <Text style={styles.escrowSub}>
            Your identity is cryptographically escrowed. University security only sees rotating anonymous dots.
          </Text>
        </View>
      </View>

      {/* Active Trip Banner (if in trip) */}
      {activeTrip && (
        <View style={styles.activeTripCard}>
          <View style={styles.activeTripHeader}>
            <Text style={styles.activeTripBadge}>ACTIVE TRIP</Text>
            <Text style={styles.tripDeadline}>
              Due: {new Date(activeTrip.returnDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <Text style={styles.activeTripText}>
            Safe perimeter & deadline monitored in background.
          </Text>
          <TouchableOpacity onPress={handleEndTrip} style={styles.endTripBtn}>
            <Text style={styles.endTripText}>Mark Arrived & End Trip</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Big SOS Button */}
      <View style={styles.sosContainer}>
        <SOSButton onTriggerSOS={handleSOS} />
      </View>

      {/* Quick Action Cards */}
      <View style={styles.cardsRow}>
        {/* Start Safe Trip Card */}
        {!activeTrip && (
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Trip')}
          >
            <Text style={styles.cardIcon}>📍</Text>
            <Text style={styles.cardTitle}>Start Safe Trip</Text>
            <Text style={styles.cardSub}>Draw safe zone & set return deadline before heading out.</Text>
          </TouchableOpacity>
        )}

        {/* Periodic Check-in Card */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('CheckIn')}
        >
          <Text style={styles.cardIcon}>🛡️</Text>
          <Text style={styles.cardTitle}>Mark Present</Text>
          <Text style={styles.cardSub}>
            {nextCheckinDue ? `Due in: ${timeRemaining}` : 'Confirm safety with 3-password factors.'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    padding: 20,
    paddingTop: 48,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  brandSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#1e293b',
  },
  logoutText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  escrowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  escrowIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  escrowTitle: {
    color: '#6ee7b7',
    fontSize: 12,
    fontWeight: '700',
  },
  escrowSub: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  activeTripCard: {
    padding: 16,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#0284c7',
    marginBottom: 20,
  },
  activeTripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activeTripBadge: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tripDeadline: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  activeTripText: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 12,
  },
  endTripBtn: {
    paddingVertical: 10,
    backgroundColor: '#0284c7',
    borderRadius: 8,
    alignItems: 'center',
  },
  endTripText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  sosContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  cardsRow: {
    gap: 12,
    marginTop: 10,
  },
  actionCard: {
    padding: 16,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 14,
  },
  cardIcon: {
    fontSize: 22,
    marginBottom: 8,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSub: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
  },
});
