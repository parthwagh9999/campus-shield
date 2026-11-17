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
import PatternLock from '../components/PatternLock';
import { api } from '../services/api';
import { useAppStore } from '../store';

export default function CheckInScreen({ navigation }: any) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [enteredInputs, setEnteredInputs] = useState<[string, string, string]>(['', '', '']);

  // Current step values
  const [pinVal, setPinVal] = useState('');
  const [patternVal, setPatternVal] = useState('');
  const [passphraseVal, setPassphraseVal] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  const { checkinIntervalHours, setCheckinDue } = useAppStore();

  const handleNextStep = (stepNumber: number, value: string) => {
    const updated: [string, string, string] = [...enteredInputs];
    updated[stepNumber - 1] = value;
    setEnteredInputs(updated);

    if (stepNumber < 3) {
      setCurrentStep(stepNumber + 1);
    } else {
      // All 3 inputs collected! Now evaluate.
      submitCheckIn(updated);
    }
  };

  const submitCheckIn = async (inputs: [string, string, string]) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.verifyCheckin(inputs);

      if (res.status === 'APPROVED') {
        // Zero-leakage UI: Exactly the same "Approved" screen for both SAFE and COERCION!
        setIsApproved(true);
        const newDue = new Date(Date.now() + checkinIntervalHours * 60 * 60 * 1000).toISOString();
        setCheckinDue(newDue);
      }
    } catch (err) {
      // Typo or invalid credentials
      setErrorMsg((err as Error).message || 'Wrong password, please try again');
      // Reset inputs for retry
      setCurrentStep(1);
      setPinVal('');
      setPatternVal('');
      setPassphraseVal('');
      setEnteredInputs(['', '', '']);
    } finally {
      setLoading(false);
    }
  };

  if (isApproved) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successCircle}>
          <Text style={styles.successIcon}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Approved — Checked In</Text>
        <Text style={styles.successSub}>
          Your wellness check-in has been confirmed. Safety countdown timer reset for {checkinIntervalHours} hours.
        </Text>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.doneBtnText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mark Present Check-In</Text>
      <Text style={styles.sub}>
        Enter all 3 security factors. Validation occurs only after all factors are entered.
      </Text>

      {/* Step Indicators */}
      <View style={styles.stepIndicatorRow}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={[
              styles.stepIndicator,
              currentStep === s && styles.stepIndicatorActive,
              currentStep > s && styles.stepIndicatorDone,
            ]}
          >
            <Text
              style={[
                styles.stepIndicatorText,
                currentStep === s && styles.stepIndicatorTextActive,
              ]}
            >
              Step {s}
            </Text>
          </View>
        ))}
      </View>

      {errorMsg && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
        </View>
      )}

      {/* Step 1: Input Slot 1 */}
      {currentStep === 1 && (
        <View style={styles.inputCard}>
          <Text style={styles.cardHeader}>Security Factor 1</Text>
          <Text style={styles.cardSub}>Enter your numeric PIN:</Text>

          <TextInput
            style={styles.pinInput}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            placeholder="••••"
            placeholderTextColor="#64748b"
            value={pinVal}
            onChangeText={setPinVal}
          />

          <TouchableOpacity
            style={[styles.nextBtn, (!pinVal || pinVal.length < 4) && styles.btnDisabled]}
            disabled={!pinVal || pinVal.length < 4}
            onPress={() => handleNextStep(1, pinVal.trim())}
          >
            <Text style={styles.nextBtnText}>Next Factor ➔</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2: Input Slot 2 */}
      {currentStep === 2 && (
        <View style={styles.inputCard}>
          <Text style={styles.cardHeader}>Security Factor 2</Text>
          <Text style={styles.cardSub}>Connect your pattern lock:</Text>

          <PatternLock onPatternComplete={(pat) => setPatternVal(pat)} />

          <TouchableOpacity
            style={[styles.nextBtn, !patternVal && styles.btnDisabled]}
            disabled={!patternVal}
            onPress={() => handleNextStep(2, patternVal)}
          >
            <Text style={styles.nextBtnText}>Next Factor ➔</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 3: Input Slot 3 */}
      {currentStep === 3 && (
        <View style={styles.inputCard}>
          <Text style={styles.cardHeader}>Security Factor 3</Text>
          <Text style={styles.cardSub}>Enter your secret passphrase:</Text>

          <TextInput
            style={styles.textInput}
            placeholder="Secret phrase"
            placeholderTextColor="#64748b"
            value={passphraseVal}
            onChangeText={setPassphraseVal}
          />

          <TouchableOpacity
            style={[styles.nextBtn, (!passphraseVal || passphraseVal.length < 3) && styles.btnDisabled]}
            disabled={!passphraseVal || passphraseVal.length < 3 || loading}
            onPress={() => handleNextStep(3, passphraseVal.trim())}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.nextBtnText}>Confirm Check-In</Text>
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
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  sub: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  stepIndicator: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  stepIndicatorActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  stepIndicatorDone: {
    backgroundColor: '#064e3b',
    borderColor: '#059669',
  },
  stepIndicatorText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  stepIndicatorTextActive: {
    color: '#ffffff',
  },
  inputCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  cardHeader: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardSub: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 20,
  },
  pinInput: {
    width: 200,
    height: 56,
    backgroundColor: '#020617',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 14,
    color: '#ffffff',
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: 24,
  },
  textInput: {
    width: '100%',
    height: 48,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 24,
  },
  nextBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#0284c7',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  errorBox: {
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 18,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center',
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 2,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successIcon: {
    color: '#10b981',
    fontSize: 40,
    fontWeight: '900',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 28,
    maxWidth: 300,
  },
  doneBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: '#0284c7',
    borderRadius: 12,
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
