import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

interface SOSButtonProps {
  onTriggerSOS: () => void;
  size?: number;
}

export default function SOSButton({ onTriggerSOS, size = 180 }: SOSButtonProps) {
  const [isPressing, setIsPressing] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePressIn = () => {
    setIsPressing(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // Haptics fallback
    }

    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();

    // Long press 1.5 seconds to trigger SOS
    timeoutRef.current = setTimeout(() => {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        // Haptics fallback
      }
      onTriggerSOS();
      setIsPressing(false);
    }, 1500);
  };

  const handlePressOut = () => {
    setIsPressing(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.wrapper}>
      {/* Outer pulsating danger ring */}
      <View
        style={[
          styles.outerRing,
          {
            width: size + 40,
            height: size + 40,
            borderRadius: (size + 40) / 2,
            backgroundColor: isPressing ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.1)',
          },
        ]}
      />

      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.button,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: isPressing ? '#b91c1c' : '#dc2626',
            },
          ]}
        >
          <Text style={styles.sosText}>SOS</Text>
          <Text style={styles.subText}>
            {isPressing ? 'HOLD 1.5s...' : 'PRESS & HOLD'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  outerRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fca5a5',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  sosText: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 3,
  },
  subText: {
    color: '#fecaca',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
  },
});
