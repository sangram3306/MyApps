import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { formatCurrency } from '../data/exchangeRates';

interface CategoryBarProps {
  icon: string;
  label: string;
  amount: number;
  currency: string;
  percentage: number;
  color: string;
  theme: 'light' | 'dark';
}

export default function CategoryBar({
  label,
  amount,
  currency,
  percentage,
  color,
  theme,
}: CategoryBarProps) {
  const colors = Colors[theme];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <View style={[styles.colorDot, { backgroundColor: color }]} />
          <Text style={[Typography.bodyMedium, { color: colors.text }]}>{label}</Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={[Typography.bodySemibold, { color: colors.text }]}>
            {formatCurrency(amount, currency)}
          </Text>
          <Text style={[Typography.caption, { color: colors.textMuted, marginLeft: 8 }]}>
            {percentage.toFixed(0)}%
          </Text>
        </View>
      </View>
      <View style={[styles.barTrack, { backgroundColor: colors.borderLight }]}>
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: color,
              width: `${Math.min(percentage, 100)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
});
