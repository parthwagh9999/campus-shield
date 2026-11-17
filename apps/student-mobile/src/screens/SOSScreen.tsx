import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';

export default function SOSScreen({ navigation }: any) {
  const [silentMode, setSilentMode] = useState(false);

  return (
    <View style={[styles.container, silentMode && styles.containerSilent]}>
      {/* Alert Header */}
      <View style={styles.alertHeader}>
        <View style={styles.pulseDot} />
        <Text style={styles.headerText}>
          {silentMode ? 'SILENT EMERGENCY ACTIVE' : 'EMERGENCY DISPATCH ACTIVE'}
        </Text>
      </View>

      <View style={styles.centerCard}>
        <Text style={styles.sosEmoji}>🚨</Text>
        <Text style={styles.title}>Help is on the way.</Text>
        <Text style={styles.sub}>
          Your live GPS coordinates, unlocked identity, dorm room, and nearest police station info have been securely dispatched to University Security.
        </Text>

        <View style={styles.streamPill}>
          <View style={styles.streamLiveDot} />
          <Text style={styles.streamText}>Live GPS Streaming (15s interval)</Text>
        </View>
      </View>

      {/* Silent mode toggle */}
      <View style={styles.silentToggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.silentTitle}>Silent Mode</Text>
          <Text style={styles.silentDesc}>Dims screen and mutes sounds if someone is watching you.</Text>
        </View>
        <Switch
          value={silentMode}
          onValueChange={setSilentMode}
          trackColor={{ false: '#334155', true: '#0284c7' }}
          thumbColor={silentMode ? '#38bdf8' : '#94a3b8'}
        />
      </View>

      {/* Cancel requires authentication */}
      <TouchableOpacity
        style={styles.cancelBtn}
        onPress={() => navigation.navigate('CheckIn')}
      >
        <Text style={styles.cancelBtnText}>Enter 3-Factor Password to Cancel Alert</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#450a0a',
    padding: 24,
    paddingTop: 60,
    justifyContent: 'space-between',
  },
  containerSilent: {
    backgroundColor: '#020617',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  headerText: {
    color: '#fca5a5',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  centerCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  sosEmoji: {
    fontSize: 54,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
  },
  sub: {
    fontSize: 13,
    color: '#cbd5e1',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  streamPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  streamLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  streamText: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '600',
  },
  silentToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  silentTitle: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  silentDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  cancelBtn: {
    paddingVertical: 14,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  cancelBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
  },
});
