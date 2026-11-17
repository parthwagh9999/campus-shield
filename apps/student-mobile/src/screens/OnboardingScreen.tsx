import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import PatternLock from '../components/PatternLock';
import { api } from '../services/api';
import { useAppStore } from '../store';

export default function OnboardingScreen({ navigation }: any) {
  const [step, setStep] = useState<number>(1);
  const [pin, setPin] = useState('');
  const [pattern, setPattern] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]); // Array of [0, 1, 2] in chosen sequence

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setFactorsConfigured = useAppStore((s) => s.setFactorsConfigured);

  const factorNames = ['4-6 Digit PIN', 'Grid Pattern', 'Short Passphrase'];

  const handleOrderPick = (factorIdx: number) => {
    if (selectedOrder.includes(factorIdx)) {
      setSelectedOrder(selectedOrder.filter((idx) => idx !== factorIdx));
    } else if (selectedOrder.length < 3) {
      setSelectedOrder([...selectedOrder, factorIdx]);
    }
  };

  const handleFinish = async () => {
    if (selectedOrder.length !== 3) {
      setError('Please choose your personal sequence by selecting all 3 factors');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.saveFactors(
        pin.trim(),
        pattern,
        passphrase.trim(),
        selectedOrder as [number, number, number],
      );

      setFactorsConfigured(true);
      Alert.alert(
        'Anti-Coercion Configured',
        'Your 3 safety factors and personal secret order are securely locked. Entering them in any other order during emergencies will silently trigger help while appearing normal to observers.',
        [{ text: 'Get Started', onPress: () => navigation.replace('Home') }],
      );
    } catch (err) {
      setError((err as Error).message || 'Failed to save security factors');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Progress header */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((s) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              step === s && styles.progressActive,
              step > s && styles.progressComplete,
            ]}
          />
        ))}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* STEP 1: PIN */}
      {step === 1 && (
        <View style={styles.stepBox}>
          <Text style={styles.badge}>Factor 1 of 3</Text>
          <Text style={styles.title}>Create Numeric PIN</Text>
          <Text style={styles.sub}>Choose a 4 to 6 digit secret number.</Text>

          <TextInput
            style={styles.pinInput}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            placeholder="••••"
            placeholderTextColor="#64748b"
            value={pin}
            onChangeText={setPin}
          />

          <TouchableOpacity
            style={[styles.button, (!pin || pin.length < 4) && styles.buttonDisabled]}
            disabled={!pin || pin.length < 4}
            onPress={() => setStep(2)}
          >
            <Text style={styles.buttonText}>Next: Pattern Lock →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 2: Pattern */}
      {step === 2 && (
        <View style={styles.stepBox}>
          <Text style={styles.badge}>Factor 2 of 3</Text>
          <Text style={styles.title}>Draw Grid Pattern</Text>
          <Text style={styles.sub}>Connect at least 4 dots in a memorable sequence.</Text>

          <PatternLock onPatternComplete={(pat) => setPattern(pat)} />

          <TouchableOpacity
            style={[styles.button, !pattern && styles.buttonDisabled]}
            disabled={!pattern}
            onPress={() => setStep(3)}
          >
            <Text style={styles.buttonText}>Next: Secret Passphrase →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 3: Passphrase */}
      {step === 3 && (
        <View style={styles.stepBox}>
          <Text style={styles.badge}>Factor 3 of 3</Text>
          <Text style={styles.title}>Secret Passphrase</Text>
          <Text style={styles.sub}>A memorable phrase or word (e.g. "safe dorm home").</Text>

          <TextInput
            style={styles.textInput}
            placeholder="Enter passphrase"
            placeholderTextColor="#64748b"
            value={passphrase}
            onChangeText={setPassphrase}
          />

          <TouchableOpacity
            style={[styles.button, (!passphrase || passphrase.length < 4) && styles.buttonDisabled]}
            disabled={!passphrase || passphrase.length < 4}
            onPress={() => setStep(4)}
          >
            <Text style={styles.buttonText}>Next: Choose Secret Order →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 4: Secret Order Setup */}
      {step === 4 && (
        <View style={styles.stepBox}>
          <Text style={styles.badge}>Anti-Coercion Lock</Text>
          <Text style={styles.title}>Choose Your Secret Order</Text>
          <Text style={styles.sub}>
            Tap each factor in the secret sequence you want to use for safe check-ins.
            Entering them in any other order will trigger silent emergency dispatch.
          </Text>

          <View style={styles.orderContainer}>
            {[0, 1, 2].map((idx) => {
              const orderIndex = selectedOrder.indexOf(idx);
              const isPicked = orderIndex !== -1;

              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleOrderPick(idx)}
                  style={[styles.factorCard, isPicked && styles.factorCardPicked]}
                >
                  <View style={styles.factorIndexBadge}>
                    <Text style={styles.factorIndexText}>
                      {isPicked ? `#${orderIndex + 1}` : '+'}
                    </Text>
                  </View>
                  <Text style={styles.factorName}>{factorNames[idx]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedOrder.length > 0 && (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Your Secret Sequence:</Text>
              <Text style={styles.summaryText}>
                {selectedOrder.map((idx, i) => `${i + 1}. ${factorNames[idx]}`).join('  ➔  ')}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, selectedOrder.length !== 3 && styles.buttonDisabled]}
            disabled={selectedOrder.length !== 3 || loading}
            onPress={handleFinish}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Lock In Anti-Coercion Factors</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  progressDot: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1e293b',
  },
  progressActive: {
    backgroundColor: '#0284c7',
    width: 36,
  },
  progressComplete: {
    backgroundColor: '#10b981',
  },
  stepBox: {
    alignItems: 'center',
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  sub: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
    lineHeight: 18,
  },
  pinInput: {
    width: 200,
    height: 56,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 14,
    color: '#ffffff',
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: 32,
  },
  textInput: {
    width: '100%',
    height: 48,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 32,
  },
  orderContainer: {
    width: '100%',
    gap: 10,
    marginBottom: 20,
  },
  factorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
  },
  factorCardPicked: {
    borderColor: '#0284c7',
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
  },
  factorIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  factorIndexText: {
    color: '#38bdf8',
    fontWeight: '700',
    fontSize: 12,
  },
  factorName: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  summaryBox: {
    width: '100%',
    padding: 12,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    color: '#38bdf8',
    fontWeight: '600',
  },
  button: {
    width: '100%',
    height: 48,
    backgroundColor: '#0284c7',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
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
});
