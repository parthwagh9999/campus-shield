import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { api } from '../services/api';
import { useAppStore } from '../store';

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [dormBuilding, setDormBuilding] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('Parent');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [checkinInterval, setCheckinInterval] = useState<number>(48);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAuth = useAppStore((s) => s.setAuth);

  const handleRegister = async () => {
    if (!email || !password || !fullName || !contactName || !contactPhone) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.register({
        universityEmail: email.trim(),
        password,
        profile: {
          fullName: fullName.trim(),
          dormBuilding: dormBuilding.trim() || undefined,
          roomNumber: roomNumber.trim() || undefined,
          emergencyContacts: [
            {
              name: contactName.trim(),
              phone: contactPhone.trim(),
              relationship: contactRelation,
            },
          ],
          medicalNotes: medicalNotes.trim() || undefined,
        },
        checkinIntervalHours: checkinInterval,
      });

      setAuth({
        token: data.token,
        studentId: data.studentId,
        universityEmail: email.trim(),
        checkinIntervalHours: data.checkinIntervalHours,
        nextCheckinDue: data.nextCheckinDue,
      });

      navigation.replace('Onboarding');
    } catch (err) {
      setError((err as Error).message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Create CampusShield Account</Text>
      <Text style={styles.sub}>
        Your identity is AES-256-GCM encrypted and only unlocked during verified emergencies.
      </Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Account Credentials</Text>
      <TextInput
        style={styles.input}
        placeholder="University Email (.edu)"
        placeholderTextColor="#64748b"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 8 chars)"
        placeholderTextColor="#64748b"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Text style={styles.sectionTitle}>Student Profile (Encrypted Vault)</Text>
      <TextInput
        style={styles.input}
        placeholder="Full Legal Name"
        placeholderTextColor="#64748b"
        value={fullName}
        onChangeText={setFullName}
      />
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 2, marginRight: 8 }]}
          placeholder="Dorm Building"
          placeholderTextColor="#64748b"
          value={dormBuilding}
          onChangeText={setDormBuilding}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Room #"
          placeholderTextColor="#64748b"
          value={roomNumber}
          onChangeText={setRoomNumber}
        />
      </View>

      <Text style={styles.sectionTitle}>Primary Emergency Contact</Text>
      <TextInput
        style={styles.input}
        placeholder="Contact Full Name"
        placeholderTextColor="#64748b"
        value={contactName}
        onChangeText={setContactName}
      />
      <TextInput
        style={styles.input}
        placeholder="Contact Phone Number"
        placeholderTextColor="#64748b"
        keyboardType="phone-pad"
        value={contactPhone}
        onChangeText={setContactPhone}
      />
      <TextInput
        style={styles.input}
        placeholder="Relationship (e.g. Parent, Sibling, Guardian)"
        placeholderTextColor="#64748b"
        value={contactRelation}
        onChangeText={setContactRelation}
      />

      <Text style={styles.sectionTitle}>Safety Check-In Interval</Text>
      <View style={styles.intervalRow}>
        {[24, 48, 72].map((hours) => (
          <TouchableOpacity
            key={hours}
            onPress={() => setCheckinInterval(hours)}
            style={[
              styles.intervalButton,
              checkinInterval === hours && styles.intervalSelected,
            ]}
          >
            <Text
              style={[
                styles.intervalText,
                checkinInterval === hours && styles.intervalTextSelected,
              ]}
            >
              Every {hours}h
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Continue to 3-Factor Setup →</Text>
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
    paddingBottom: 48,
  },
  header: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  sub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    height: 44,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#ffffff',
    fontSize: 13,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
  },
  intervalRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  intervalButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  intervalSelected: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  intervalText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  intervalTextSelected: {
    color: '#ffffff',
  },
  button: {
    height: 48,
    backgroundColor: '#0284c7',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  errorBox: {
    padding: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 14,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    textAlign: 'center',
  },
});
