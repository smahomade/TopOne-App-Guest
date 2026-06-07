import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const rules = [
  (v: string) => v.length >= 8,
  (v: string) => /[A-Z]/.test(v),
  (v: string) => /[0-9]/.test(v),
  (v: string) => /[^A-Za-z0-9]/.test(v),
];

const levels = [
  { label: 'Weak',   color: '#E24B4A' },
  { label: 'Fair',   color: '#EF9F27' },
  { label: 'Good',   color: '#D4C017' },
  { label: 'Strong', color: '#1D9E75' },
];

type Props = { value: string };

export default function PasswordStrengthMeter({ value }: Props) {
  if (!value) return null;

  const score = rules.filter(r => r(value)).length;
  const { label, color } = levels[score - 1] ?? levels[0];

  return (
    <View style={styles.wrapper}>
      <View style={styles.bars}>
        {[0, 1, 2, 3].map(i => (
          <View
            key={i}
            style={[styles.bar, { backgroundColor: i < score ? color : '#3a3a3a' }]}
          />
        ))}
      </View>
      <Text style={[styles.strengthLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:       { marginTop: 8 },
  bars:          { flexDirection: 'row', gap: 4, marginBottom: 4 },
  bar:           { flex: 1, height: 3, borderRadius: 99 },
  strengthLabel: { fontSize: 12, fontWeight: '500' },
});