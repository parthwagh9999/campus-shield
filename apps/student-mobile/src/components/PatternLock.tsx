import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

interface PatternLockProps {
  onPatternComplete: (patternStr: string) => void;
}

export default function PatternLock({ onPatternComplete }: PatternLockProps) {
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);

  const handleNodePress = (index: number) => {
    if (selectedNodes.includes(index)) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics fallback on web/emulators
    }

    const nextNodes = [...selectedNodes, index];
    setSelectedNodes(nextNodes);

    if (nextNodes.length >= 4) {
      onPatternComplete(nextNodes.join('-'));
    }
  };

  const handleReset = () => {
    setSelectedNodes([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        {selectedNodes.length === 0
          ? 'Connect at least 4 dots'
          : `Connected: ${selectedNodes.length} dots`}
      </Text>

      <View style={styles.grid}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
          const isSelected = selectedNodes.includes(index);
          const order = selectedNodes.indexOf(index) + 1;

          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              onPress={() => handleNodePress(index)}
              style={[
                styles.node,
                isSelected ? styles.nodeSelected : styles.nodeDefault,
              ]}
            >
              {isSelected ? (
                <Text style={styles.nodeNumber}>{order}</Text>
              ) : (
                <View style={styles.nodeDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedNodes.length > 0 && (
        <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
          <Text style={styles.resetText}>Clear Pattern</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  hint: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 16,
  },
  grid: {
    width: 260,
    height: 260,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  node: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDefault: {
    backgroundColor: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  nodeSelected: {
    backgroundColor: '#0284c7',
    borderWidth: 2,
    borderColor: '#38bdf8',
  },
  nodeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#64748b',
  },
  nodeNumber: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  resetButton: {
    marginTop: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  resetText: {
    color: '#94a3b8',
    fontSize: 12,
  },
});
