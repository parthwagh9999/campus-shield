import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { api } from '../services/api';
import { useAppStore } from '../store';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setAuth = useAppStore((s) => s.setAuth);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const data = await api.login(email.trim(), password);
      setAuth({
        token: data.token,
        studentId: data.studentId,
        universityEmail: email.trim(),
        checkinIntervalHours: data.checkinIntervalHours,
        nextCheckinDue: data.nextCheckinDue,
      });
    } catch (err) {
      setError((err as Error).message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>🛡️</Text>
        </View>

        <Text style={styles.title}>CampusShield</Text>
        <Text style={styles.subtitle}>Privacy-by-Default Student Safety</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>University Email</Text>
          <TextInput
            style={styles.input}
            placeholder="student@university.edu"
            placeholderTextColor="#64748b"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••••••"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={styles.switchLink}
        >
          <Text style={styles.switchText}>
            First time? <Text style={styles.linkBold}>Create Account</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 20,
  },
  errorBox: {
    width: '100%',
    padding: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    textAlign: 'center',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    height: 44,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#ffffff',
    fontSize: 14,
  },
  button: {
    width: '100%',
    height: 46,
    backgroundColor: '#0284c7',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  switchLink: {
    marginTop: 18,
  },
  switchText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  linkBold: {
    color: '#38bdf8',
    fontWeight: '700',
  },
});
